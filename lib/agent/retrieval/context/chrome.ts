import { CHROME_BLOCKS, CHROME_NAV, type ChromeBlock } from "@/lib/data/chrome.generated";
import { extractNumerals } from "@/lib/agent/llm/verify";
import type { ContextBundle, ViewId } from "@/lib/agent/retrieval/types";

/** Every block, by id. Built once: the registry is generated at build time. */
const byId = new Map(CHROME_BLOCKS.map((block) => [block.id, block]));

export function listChromeBlocks(): ChromeBlock[] {
  return CHROME_BLOCKS;
}

/** What the menu calls a page, which is the name a reader will use for it. */
export function pageLabel(view: ViewId | undefined): string | undefined {
  if (!view) return undefined;
  const items = CHROME_NAV.filter((item) => item.view === view);
  return (items.find((item) => item.source === "nav") ?? items[0])?.label;
}

/**
 * What one panel on screen says, and what that panel is showing.
 *
 * A reader pointing at a heading is asking two things at once — what these
 * words mean, and what the panel under them does — and only the first is
 * answerable from the words. So the block's own text is paired with the
 * page's material whenever that page has a builder, and the model writes the
 * sentence from both. Nothing here glosses a heading in stored prose: a
 * per-heading explanation table would contradict the panel the first time
 * either changed.
 */
export async function buildChromeBundle(id: string): Promise<ContextBundle> {
  const block = byId.get(id);
  if (!block) throw new Error(`unknown chrome block ${id}`);

  const label = pageLabel(block.view);
  const lines = [
    label
      ? `Teks ini tampil di halaman ${label}.`
      : `Teks ini tampil di beberapa halaman, jadi bukan milik satu halaman saja.`,
    `Judul panel: "${block.heading}".`,
  ];
  if (block.eyebrow) lines.push(`Label kecil di atas judul itu: "${block.eyebrow}".`);
  if (block.description) lines.push(`Kalimat di bawah judul itu: "${block.description}"`);
  if (block.labels?.length) lines.push(`Label di dalam panel: ${block.labels.map((text) => `"${text}"`).join(", ")}.`);
  if (block.actions?.length) lines.push(`Tombol atau tautan di panel itu: ${block.actions.map((text) => `"${text}"`).join(", ")}.`);

  const body = lines.join("\n");
  return {
    id: block.id,
    kind: "chrome",
    view: block.view,
    title: block.heading,
    body,
    figures: extractNumerals(body),
    // A panel's words cite nothing: they are the app's own copy, not a
    // recording. The page material that answers what the panel *shows* is
    // fetched alongside this bundle and brings its own sources.
    citations: [],
    symbols: [],
  };
}
