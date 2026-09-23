// Writes lib/data/chrome.generated.ts from the pages and components themselves.
//
// The assistant could not answer "what does this heading mean" because every
// heading a reader sees is JSX in a component and nothing indexed it. A
// hand-kept list of headings would rot by omission — adding a panel is not
// what breaks it — so the list is read out of the source on every build.
//
// What is captured is the block a reader actually reads: the eyebrow above a
// heading, the heading, the sentence under it, and the link out of it. A
// heading whose text is computed is skipped rather than guessed at; those
// panels are data-driven and the data bundles already reach them.
//
// Usage: node scripts/build-chrome-registry.mjs [--check]

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(ROOT, "lib/data/chrome.generated.ts");
const ROOTS = ["app", "components"];

const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4"]);
const DESCRIPTION_TAGS = new Set(["p", "dd"]);
const ACTION_TAGS = new Set(["Link", "a", "Button", "button"]);
const LABEL_TAGS = new Set(["dt", "label", "legend"]);
/** How an eyebrow is written in this codebase: the `meta` utility, or the
 *  long-hand it expands to. Both appear, so both are recognised. */
const EYEBROW_CLASS = /(^|\s)meta(\s|$)|uppercase\s+tracking-wider/;

/** Every .tsx under a root, excluding generated and test trees. */
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (name.endsWith(".tsx")) out.push(path);
  }
  return out;
}

function classNameOf(node) {
  const opening = ts.isJsxElement(node) ? node.openingElement : node;
  if (!opening.attributes) return "";
  const parts = [];
  for (const attribute of opening.attributes.properties) {
    if (!ts.isJsxAttribute(attribute) || attribute.name.getText() !== "className") continue;
    const initializer = attribute.initializer;
    if (!initializer) continue;
    if (ts.isStringLiteral(initializer)) parts.push(initializer.text);
    else if (ts.isJsxExpression(initializer) && initializer.expression) {
      // cn("a", condition ? "b" : "c") — every literal inside counts, because
      // an eyebrow written through a helper is still an eyebrow.
      const collect = (child) => {
        if (ts.isStringLiteral(child) || ts.isNoSubstitutionTemplateLiteral(child)) parts.push(child.text);
        child.forEachChild(collect);
      };
      collect(initializer.expression);
    }
  }
  return parts.join(" ");
}

function tagOf(node) {
  if (ts.isJsxElement(node)) return node.openingElement.tagName.getText();
  if (ts.isJsxSelfClosingElement(node)) return node.tagName.getText();
  return "";
}

/**
 * The literal words an element puts on screen, or null.
 *
 * An element holding a computed child returns null rather than its literal
 * fragment: "Atau buka kasus {symbol}" is not a sentence the registry can
 * claim, and half of it is worse than none.
 */
function staticTextOf(node) {
  if (!ts.isJsxElement(node)) return null;
  let text = "";
  let computed = false;
  const visit = (child) => {
    if (ts.isJsxText(child)) { text += child.text; return; }
    if (ts.isJsxExpression(child)) {
      const expression = child.expression;
      if (!expression) return; // a comment
      if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) { text += expression.text; return; }
      computed = true;
      return;
    }
    if (ts.isJsxSelfClosingElement(child)) return; // an icon
    if (ts.isJsxElement(child)) { child.children.forEach(visit); return; }
  };
  node.children.forEach(visit);
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (computed || !cleaned) return null;
  return cleaned;
}

/**
 * Which page a route file is, or undefined.
 *
 * Only `page.tsx` answers here. Everything else — including a client file
 * sitting inside a route folder — is left to reachability, because a folder
 * is where a file was put and reachability is where its words are read. The
 * case screen's body lives under `app/companies/[symbol]/` and is rendered
 * only by `app/cases/[symbol]`, and the reader is on the case page.
 */
function viewOf(path) {
  const rel = relative(ROOT, path).split(sep).join("/");
  if (!rel.endsWith("/page.tsx")) return undefined;
  if (rel === "app/page.tsx") return "dashboard";
  const match = /^app\/([^/]+)\//.exec(rel);
  if (!match) return undefined;
  const segment = match[1];
  if (segment === "api") return undefined;
  // app/cases/[symbol]/page.tsx is one case; app/cases/page.tsx is the list.
  if (segment === "cases") return rel.includes("[") ? "case" : "cases";
  if (segment === "companies") return rel.includes("[") ? "company" : "companies";
  return segment;
}

function slugOf(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

/** The project files one file imports, as absolute paths that exist. */
function importsOf(path) {
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out = [];
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const specifier = statement.moduleSpecifier.text;
    if (!specifier.startsWith("@/")) continue;
    const base = join(ROOT, specifier.slice(2));
    for (const candidate of [`${base}.tsx`, join(base, "index.tsx")]) {
      try { if (statSync(candidate).isFile()) { out.push(candidate); break; } } catch { /* not a component */ }
    }
  }
  return out;
}

/**
 * Which page each file's words belong to.
 *
 * A page is often a one-line file handing its whole body to a component —
 * `app/pantau/page.tsx` renders `WebWatchReview` and nothing else — so path
 * alone leaves those headings unattributed and the reader on that page gets
 * no ranking boost for them. Reachability answers it instead: a component
 * reached from exactly one page belongs to that page, and one reached from
 * several belongs to none, which is the honest answer for a shared panel.
 */
function viewsByFile(files) {
  const reached = new Map(files.map((file) => [file, new Set()]));
  const imports = new Map(files.map((file) => [file, importsOf(file)]));
  for (const file of files) {
    const view = viewOf(file);
    if (!view) continue;
    const queue = [file];
    const seenHere = new Set();
    while (queue.length) {
      const current = queue.shift();
      if (seenHere.has(current)) continue;
      seenHere.add(current);
      reached.get(current)?.add(view);
      for (const next of imports.get(current) ?? []) queue.push(next);
    }
  }
  const out = new Map();
  for (const [file, views] of reached) out.set(file, views.size === 1 ? [...views][0] : undefined);
  return out;
}

/**
 * The navigation, read from whatever array declares it.
 *
 * The rule is structural — an object carrying both a literal `href` and a
 * literal `label` is a menu item — so moving or renaming the nav array does
 * not silently empty this. A reader who asks "what is the Sebab akibat page"
 * is using the word the menu gave them, and nothing else in the app spells
 * a page's name.
 */
function navIn(path) {
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out = [];
  // The sidebar and the command palette declare the same shape, so the only
  // thing separating "Dashboard" from "Buka Dashboard" is which array they
  // are in. The sidebar's is the name the page carries everywhere else, so
  // that is the one an answer should use; the palette's phrasing is kept as
  // vocabulary because a reader may well say it.
  let declaration = "";
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && node.name) declaration = node.name.getText();
    if (ts.isObjectLiteralExpression(node)) {
      const literal = (name) => {
        for (const property of node.properties) {
          if (!ts.isPropertyAssignment(property) || property.name.getText() !== name) continue;
          const value = property.initializer;
          if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) return value.text;
        }
        return null;
      };
      const href = literal("href");
      const label = literal("label");
      if (href && label && href.startsWith("/")) out.push({ href, label, source: /nav/i.test(declaration) ? "nav" : "command" });
    }
    node.forEachChild(visit);
  };
  visit(source);
  return out;
}

/** The page id a nav href points at, using the same rule as a route file. */
function viewOfHref(href) {
  // A tab or filter in the query string still lands on the same page, and the
  // page is what the reader is being sent to.
  const path = href.split(/[?#]/)[0];
  if (path === "/") return "dashboard";
  return viewOf(join(ROOT, "app", path.replace(/^\//, ""), "page.tsx"));
}

/** A static string prop, or null when it is computed. */
function staticPropOf(node, name) {
  const opening = ts.isJsxElement(node) ? node.openingElement : node;
  if (!opening.attributes) return null;
  for (const attribute of opening.attributes.properties) {
    if (!ts.isJsxAttribute(attribute) || attribute.name.getText() !== name) continue;
    const initializer = attribute.initializer;
    if (!initializer) return null;
    if (ts.isStringLiteral(initializer)) return initializer.text;
    if (ts.isJsxExpression(initializer) && initializer.expression) {
      const expression = initializer.expression;
      if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text;
    }
    return null;
  }
  return null;
}

/**
 * A heading passed as props rather than written as a tag.
 *
 * `PageHeader` and `PanelHeader` carry most of this app's headings, and a
 * named list of them would need editing every time another one is written.
 * The test is structural instead: a component — capitalised, so never a
 * `<button title="…">` — that is given a literal title or eyebrow is
 * presenting a heading, whatever it is called.
 */
function headerPropsOf(node) {
  const tag = tagOf(node);
  if (!/^[A-Z]/.test(tag)) return null;
  const title = staticPropOf(node, "title");
  const eyebrow = staticPropOf(node, "eyebrow");
  if (!title && !eyebrow) return null;
  return { heading: title ?? eyebrow, eyebrow: title ? eyebrow ?? "" : "", description: staticPropOf(node, "description") ?? "" };
}

/**
 * A region the app names for a screen reader, and the words inside it.
 *
 * The dashboard's counter strip has no heading — it is a row of numbers with
 * their units, "sumber terekam", "pemicu bersama" — so nothing above would
 * capture it, and those units are exactly what a reader points at when they
 * ask what a number counts. `aria-label` already names these regions for
 * anyone using a screen reader, and naming them once is enough.
 *
 * Fragments are collected one run of literal text at a time, because the
 * numbers between them are computed and the words around them are not.
 */
function regionsIn(source, rel, view) {
  const blocks = [];
  const visit = (node) => {
    if (ts.isJsxElement(node)) {
      const name = staticPropOf(node, "aria-label");
      if (name) {
        const fragments = [];
        const gather = (child) => {
          if (ts.isJsxText(child)) {
            const text = child.text.replace(/\s+/g, " ").trim();
            // One word is a fragment of a sentence, not a label: "di" and
            // "dari" are what is left between two computed numbers.
            if (text.includes(" ")) fragments.push(text);
            return;
          }
          if (ts.isJsxExpression(child)) {
            const expression = child.expression;
            if (expression && (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression))) {
              const text = expression.text.replace(/\s+/g, " ").trim();
              if (text.includes(" ")) fragments.push(text);
            }
            return;
          }
          if (ts.isJsxElement(child)) child.children.forEach(gather);
        };
        node.children.forEach(gather);
        const labels = [...new Set(fragments)];
        if (labels.length) {
          blocks.push({
            id: `chrome:${view ?? "shared"}:${slugOf(name)}`,
            heading: name, view, file: rel,
            eyebrow: "", description: "", actions: [], labels,
          });
        }
      }
    }
    node.forEachChild(visit);
  };
  visit(source);
  return blocks;
}

/**
 * Tab and toggle labels, which are words on screen that no tag holds.
 *
 * `{ value: "node", label: "Peta Sebab Akibat" }` renders the control a reader
 * clicks, but it is an array entry rather than JSX, so every scraper above
 * walks straight past it. A reader who asks what the "Grafik Indeks" tab
 * shows was answered about whichever recording shared a word with it.
 *
 * The shape is required to be a switch: at least two entries, each an object
 * carrying a literal label and the literal key the component switches on.
 * That excludes chart series, option lists built from data, and anything
 * whose text is computed — the bundles already answer for those.
 */
function switchesIn(source, rel, view) {
  const blocks = [];
  const KEY_PROPS = new Set(["value", "id", "key", "tab"]);
  const literalProp = (object, names) => {
    for (const property of object.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const name = property.name.getText().replace(/['"]/g, "");
      if (!names.has(name)) continue;
      const initializer = property.initializer;
      if (ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer)) return initializer.text;
    }
    return null;
  };
  const visit = (node) => {
    if (ts.isArrayLiteralExpression(node) && node.elements.length >= 2) {
      const entries = [];
      for (const element of node.elements) {
        if (!ts.isObjectLiteralExpression(element)) return void node.forEachChild(visit);
        const label = literalProp(element, new Set(["label"]));
        const key = literalProp(element, KEY_PROPS);
        if (!label || !key) return void node.forEachChild(visit);
        entries.push(label);
      }
      for (const label of entries) {
        blocks.push({
          id: `chrome:${view ?? "shared"}:${slugOf(label)}`,
          heading: label, view, file: rel,
          eyebrow: "Tab", description: "", actions: [], labels: entries.filter((other) => other !== label),
        });
      }
    }
    node.forEachChild(visit);
  };
  visit(source);
  return blocks;
}

/** The heading blocks in one file. */
function blocksIn(path, view) {
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const rel = relative(ROOT, path).split(sep).join("/");
  const blocks = [];

  const parentOf = new Map();
  const index = (node, parent) => {
    if (parent) parentOf.set(node, parent);
    node.forEachChild((child) => index(child, node));
  };
  index(source, undefined);

  const jsxParent = (node) => {
    let current = parentOf.get(node);
    while (current && !ts.isJsxElement(current)) current = parentOf.get(current);
    return current;
  };

  const visit = (node) => {
    if (ts.isJsxElement(node) && HEADING_TAGS.has(tagOf(node))) {
      const heading = staticTextOf(node);
      if (heading) {
        const parent = jsxParent(node);
        const siblings = { eyebrow: "", description: "", actions: [], labels: [] };
        if (parent) {
          const scan = (child) => {
            if (child === node) return;
            if (ts.isJsxElement(child)) {
              const tag = tagOf(child);
              const text = staticTextOf(child);
              if (text) {
                const className = classNameOf(child);
                if (!siblings.eyebrow && EYEBROW_CLASS.test(className) && !HEADING_TAGS.has(tag)) siblings.eyebrow = text;
                else if (!siblings.description && DESCRIPTION_TAGS.has(tag)) siblings.description = text;
                else if (ACTION_TAGS.has(tag)) siblings.actions.push(text);
                else if (LABEL_TAGS.has(tag)) siblings.labels.push(text);
              }
              child.children.forEach(scan);
            }
          };
          parent.children.forEach(scan);
        }
        blocks.push({
          id: `chrome:${view ?? "shared"}:${slugOf(heading)}`,
          heading, view, file: rel,
          eyebrow: siblings.eyebrow,
          description: siblings.description,
          actions: [...new Set(siblings.actions)],
          labels: [...new Set(siblings.labels)],
        });
      }
    }
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const header = headerPropsOf(node);
      if (header) {
        blocks.push({
          id: `chrome:${view ?? "shared"}:${slugOf(header.heading)}`,
          heading: header.heading, view, file: rel,
          eyebrow: header.eyebrow,
          description: header.description,
          actions: [],
          labels: [],
        });
      }
    }
    node.forEachChild(visit);
  };
  visit(source);
  blocks.push(...regionsIn(source, rel, view));
  blocks.push(...switchesIn(source, rel, view));
  return blocks;
}

function render(blocks, nav) {
  const rows = blocks.map((block) => {
    const field = (name, value) => (value ? `\n    ${name}: ${JSON.stringify(value)},` : "");
    const list = (name, values) => (values.length ? `\n    ${name}: ${JSON.stringify(values)},` : "");
    return `  {
    id: ${JSON.stringify(block.id)},
    heading: ${JSON.stringify(block.heading)},${field("view", block.view)}${field("eyebrow", block.eyebrow)}${field("description", block.description)}${list("actions", block.actions)}${list("labels", block.labels)}
    file: ${JSON.stringify(block.file)},
  },`;
  });
  return `// GENERATED FILE — do not edit by hand.
// Written by scripts/build-chrome-registry.mjs from the JSX in app/ and
// components/. A block exists here because a reader can see those words on a
// screen. Headings whose text is computed are absent by design: the bundles
// that hold their data already answer for them.

import type { ViewId } from "@/lib/agent/retrieval/types";

/** One group of words a reader reads together: the eyebrow, the heading, the
 *  sentence under it, and the way out of it. */
export interface ChromeBlock {
  id: string;
  heading: string;
  view?: ViewId;
  eyebrow?: string;
  description?: string;
  actions?: string[];
  labels?: string[];
  file: string;
}

export const CHROME_BLOCKS: ChromeBlock[] = [
${rows.join("\n")}
];

/** How the menu names each page, which is how a reader names it too. */
export const CHROME_NAV: Array<{ href: string; label: string; source: "nav" | "command"; view?: ViewId }> = [
${nav.map((item) => `  { href: ${JSON.stringify(item.href)}, label: ${JSON.stringify(item.label)}, source: ${JSON.stringify(item.source)},${item.view ? ` view: ${JSON.stringify(item.view)},` : ""} },`).join("\n")}
];
`;
}

const files = ROOTS.flatMap((root) => walk(join(ROOT, root)));
const views = viewsByFile(files);
const blocks = files.flatMap((file) => blocksIn(file, views.get(file))).sort((first, second) => first.id.localeCompare(second.id));

// Two panels can carry the same heading on the same page. Keeping both under
// one id would make the later one unreachable, so the id is made unique and
// the file it came from stays on the row.
const seen = new Map();
for (const block of blocks) {
  const count = (seen.get(block.id) ?? 0) + 1;
  seen.set(block.id, count);
  if (count > 1) block.id = `${block.id}-${count}`;
}

// The sidebar and the command palette name the same destinations differently,
// and a reader may use either word. Both are kept; only an exact repeat drops.
const nav = [...new Map(
  files.flatMap(navIn).map((item) => [`${item.href}\u0000${item.label}`, { ...item, view: viewOfHref(item.href) }]),
).values()].sort((first, second) => (first.href + first.label).localeCompare(second.href + second.label));

const rendered = render(blocks, nav);
if (process.argv.includes("--check")) {
  const current = readFileSync(OUT, "utf8");
  if (current !== rendered) {
    console.error("chrome.generated.ts is stale — run: node scripts/build-chrome-registry.mjs");
    process.exit(1);
  }
  console.log(`chrome registry current: ${blocks.length} blocks`);
} else {
  writeFileSync(OUT, rendered);
  console.log(`wrote ${blocks.length} blocks to lib/data/chrome.generated.ts`);
}
