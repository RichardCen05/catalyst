/**
 * Safe regular-expression construction for operator/user-supplied patterns.
 *
 * Context (pentest vuln-0001, CWE-1333): `lib/web-watch/fetching.ts`
 * interpolated a listing `linkPattern` straight into `new RegExp()`, and an
 * inline "escape" attempt then broke compilation outright (unterminated
 * character class — `pnpm lint` failed). This module is the defense-in-depth
 * layer the assessment recommended (Rec 2: regex-timeout wrapper):
 *
 *  1. `escapeRegExp` — the correct literal-escaping one-liner, for values
 *     that must match literally (tag names, cookie names).
 *  2. `compileListingPattern` — keeps regex semantics for `linkPattern`
 *     (seeds and tests rely on classes like `[^"']+` and `\d+`), but bounds
 *     the risk: length cap, nested-quantifier heuristic reject (the classic
 *     `(a+)+` ReDoS shape), and compile in try/catch. Failures throw
 *     `SafePatternError` (permanent misconfiguration — callers surface it as
 *     a `FetchError`, never a 500).
 *  3. `testWithBudget` — JS `RegExp` has no native timeout, so the "timeout"
 *     is enforced observationally: inputs are length-capped (URLs, not whole
 *     pages) and each test is timed; an over-budget test returns `false`
 *     (skip that URL) instead of hanging the scheduler sweep.
 *
 * `linkPattern` values come from seed config / registry entries, not raw end
 * users, but the registry is writable at runtime — hence fail-closed here.
 */

export class SafePatternError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SafePatternError";
  }
}

/** Escape a string so it matches literally inside `new RegExp()`. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Longest `linkPattern` accepted. Seeds are all < 60 chars; 200 leaves
 *  headroom while keeping worst-case backtracking bounded. */
export const MAX_PATTERN_LENGTH = 200;

/** Longest single input `testWithBudget` will run against. Absolute URLs
 *  longer than this are skipped (return false) — no legitimate listing link
 *  needs 2 KB. */
export const MAX_TEST_INPUT_LENGTH = 2048;

/** Per-test observation budget in milliseconds. Exceeding it means the
 *  pattern/input combination is pathological — skip, don't hang the sweep. */
export const TEST_BUDGET_MS = 25;

/** Upper bound on `<a>` tags scanned per listing page. Bounds total
 *  `testWithBudget` calls per check to a constant. */
export const MAX_ANCHORS_PER_PAGE = 5000;

// A quantified group/class that itself contains a quantifier — the
// `(a+)+` / `([a-z]*)*` / `(\d+)+$` ReDoS shape. Checked on the raw source
// before compiling.
const NESTED_QUANTIFIER =
  /(\([^)]*[+*{][^)]*\)[+*{]|\[[^\]\\]*(?:\\.[^\]\\]*)*[+*{][^\]\\]*\][+*{])/;

export function assertSafePatternSource(pattern: string): void {
  if (pattern.length > MAX_PATTERN_LENGTH) {
    throw new SafePatternError(
      `Pattern too long (${pattern.length} > ${MAX_PATTERN_LENGTH}) — refused to prevent ReDoS.`,
    );
  }
  if (NESTED_QUANTIFIER.test(pattern)) {
    throw new SafePatternError(
      "Pattern contains a nested quantifier (e.g. `(a+)+`) — refused to prevent ReDoS.",
    );
  }
}

/** Compile an operator-supplied listing pattern. Empty matches everything
 *  (preserves the `linkPattern ?? ""` default in `checkListing`). Throws
 *  `SafePatternError` on anything unsafe or uncompilable. */
export function compileListingPattern(pattern: string): RegExp {
  assertSafePatternSource(pattern);
  try {
    return new RegExp(pattern);
  } catch (error) {
    throw new SafePatternError(
      `Pattern does not compile: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Timed `RegExp.test` against a length-capped input. Returns `false` for
 * over-long inputs and over-budget runs (skip-that-URL semantics). The
 * regex is used unflagged by all callers, so no `lastIndex` reset is needed;
 * the reset below only guards future global-flag reuse.
 */
export function testWithBudget(
  re: RegExp,
  input: string,
  budgetMs: number = TEST_BUDGET_MS,
): boolean {
  if (input.length > MAX_TEST_INPUT_LENGTH) return false;
  const start = Date.now();
  const matched = re.test(input);
  re.lastIndex = 0;
  if (Date.now() - start > budgetMs) return false;
  return matched;
}

/** Tag names interpolated into the feed-field pattern. Internal callers pass
 *  literals (`title`, `link`, `guid`, …); the allowlist keeps a future caller
 *  from ever turning this into an injection sink. */
const FIELD_NAME = /^[A-Za-z][A-Za-z0-9_-]*$/;

export function buildFieldPattern(name: string): RegExp {
  if (!FIELD_NAME.test(name)) {
    throw new SafePatternError(`Refusing to build a field pattern from unsafe name: ${name}`);
  }
  return new RegExp(`<(?:\\w+:)?${escapeRegExp(name)}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${escapeRegExp(name)}>`, "i");
}
