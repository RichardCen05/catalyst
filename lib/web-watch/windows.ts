/**
 * Prose windows — the parts of a fetched page the NLI screen reads.
 *
 * A fetched body starts with whatever the site put first: CNBC opens with CSS
 * class fragments and menus, BI with several thousand characters of
 * navigation. Raw offsets would hand the model that chrome. So windows are
 * built only from whole sentences that pass the same prose test triage uses
 * (`sentenceSpans`, `webWatchProseSentenceMinWords`): a menu entry has no
 * sentence ending and too few words, so it can never open a window.
 *
 * Each window keeps where it starts in the body, so a verdict can quote its
 * evidence as a span of the original text.
 */

import { sentenceSpans } from "@/lib/web-watch/triage";

export interface ProseWindow {
  text: string;
  /** Offset of the window's first character in the body. */
  start: number;
}

export interface ProseWindowOptions {
  maxWindows: number;
  minWords: number;
  maxChars: number;
}

/**
 * Consecutive prose sentences packed into windows of at most `maxChars`,
 * first ones first, at most `maxWindows` of them. A single sentence longer
 * than `maxChars` becomes its own window, cut at the limit. Sentences are
 * joined with a space, so a window's text is not a verbatim slice of the body;
 * `start` still points at its first sentence.
 */
export function proseWindows(body: string, opts: ProseWindowOptions): ProseWindow[] {
  const windows: ProseWindow[] = [];
  if (opts.maxWindows <= 0 || opts.maxChars <= 0) return windows;
  let current: ProseWindow | null = null;
  for (const sentence of sentenceSpans(body, opts.minWords)) {
    if (current && current.text.length + 1 + sentence.text.length <= opts.maxChars) {
      current.text = `${current.text} ${sentence.text}`;
      continue;
    }
    if (current) {
      windows.push(current);
      if (windows.length >= opts.maxWindows) return windows;
    }
    current = { text: sentence.text.slice(0, opts.maxChars), start: sentence.start };
  }
  if (current && windows.length < opts.maxWindows) windows.push(current);
  return windows;
}
