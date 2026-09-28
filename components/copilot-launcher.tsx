"use client";

import { useEffect, useState, type RefObject } from "react";
import { apiUrl } from "@/lib/api-base";
import { Blobatar } from "@blobatar/react";
import { useGaze } from "@blobatar/react/gaze";
import { ASSISTANT_NAME, buildQuickPrompts } from "@/lib/agent/assistant";
import { resolveContext } from "@/lib/agent/route-context";
import { useCopilotSession } from "@/lib/copilot-session";
import { useCatalystStore } from "@/lib/store";

/** Typing cadence. Fast enough to finish a prompt before a reader looks away,
 *  slow enough to read as typing rather than as text appearing. */
const TYPE_MS = 42;
const ERASE_MS = 18;
const HOLD_MS = 2600;
/** The bubble holds two lines. A longer line would type straight past the
 *  clip and take the caret with it, so it is cut at a word before it is ever
 *  typed — the same cut buildQuickPrompts already makes on a long headline,
 *  one step further in. A today fact is written to 20 words, which fits. */
const LINE_MAX = 78;

/** How many watchlist emiten are greeted. The route caps this too; asking for
 *  fewer than it allows is the launcher's own restraint, not a limit. */
const FACT_SYMBOLS = 3;

function fit(line: string): string {
  if (line.length <= LINE_MAX) return line;
  const cut = line.slice(0, LINE_MAX);
  const space = cut.lastIndexOf(" ");
  return `${(space > LINE_MAX / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** The launcher types a question the assistant can actually answer — the same
 *  prompts the panel offers as chips, built from the recordings — so the
 *  invitation is never a promise the engine then refuses. Nothing here writes
 *  a line of its own. */
export function CopilotLauncher({ triggerRef }: { triggerRef: RefObject<HTMLButtonElement | null> }) {
  const profile = useCatalystStore((state) => state.profile);
  const copilotContext = useCatalystStore((state) => state.copilotContext);
  const setCopilotOpen = useCatalystStore((state) => state.setCopilotOpen);
  const routeSymbol = useCopilotSession((state) => state.routeSymbol);
  // The launcher types the chips the panel offers, about the case in front of
  // the reader — the same resolution the panel makes, so the invitation and
  // the chips never name different emitens.
  const prompts = buildQuickPrompts(profile, resolveContext(copilotContext, routeSymbol)?.symbol);
  const [typed, setTyped] = useState("");
  // Today's facts arrive after the first prompts are already typing. They are
  // optional by design: deterministic mode, a spent budget and a draft the
  // verifier rejected all answer with nothing, and the bubble then says only
  // what it already had.
  const [facts, setFacts] = useState<string[]>([]);
  // The eyes follow the pointer, which is what makes a reader notice the thing
  // is an assistant rather than a badge.
  const { ref: faceRef } = useGaze({ travel: 3, lookAt: "pointer" });

  const watched = profile.watchlist.slice(0, FACT_SYMBOLS).join(",");
  useEffect(() => {
    if (!watched) return;
    const abort = new AbortController();
    void fetch(apiUrl(`/api/fact?symbols=${encodeURIComponent(watched)}`), { signal: abort.signal })
      .then((response) => (response.ok ? response.json() : { facts: [] }))
      .then((body: { facts?: { fact: string }[] }) => setFacts((body.facts ?? []).map((entry) => entry.fact)))
      .catch(() => undefined);
    return () => abort.abort();
  }, [watched]);

  // A prompt list is rebuilt on every render, so the effect keys on the lines
  // themselves rather than on the array's identity — otherwise the typewriter
  // restarts from an empty string on every unrelated store update.
  const lines: string[] = [];
  for (let index = 0; index < Math.max(prompts.length, facts.length); index += 1) {
    if (prompts[index]) lines.push(prompts[index]);
    if (facts[index]) lines.push(facts[index]);
  }
  const key = lines.map(fit).join("\n");
  useEffect(() => {
    const list = key.split("\n");
    // Reduced motion gets the finished sentence and no cycle: the point of the
    // animation is attention, and attention is exactly what the preference
    // asks us not to take by movement.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const settle = setTimeout(() => setTyped(list[0] ?? ""), 0);
      return () => clearTimeout(settle);
    }
    let index = 0;
    let cut = 0;
    let erasing = false;
    let handle: ReturnType<typeof setTimeout>;
    const step = () => {
      const line = list[index] ?? "";
      if (!erasing && cut < line.length) { cut += 1; setTyped(line.slice(0, cut)); handle = setTimeout(step, TYPE_MS); return; }
      if (!erasing) { erasing = true; handle = setTimeout(step, HOLD_MS); return; }
      if (cut > 0) { cut -= 1; setTyped(line.slice(0, cut)); handle = setTimeout(step, ERASE_MS); return; }
      erasing = false;
      index = (index + 1) % list.length;
      handle = setTimeout(step, TYPE_MS);
    };
    handle = setTimeout(step, TYPE_MS);
    return () => clearTimeout(handle);
  }, [key]);

  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={() => setCopilotOpen(true)}
      aria-label="Tanya asisten"
      className="group fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] right-3 z-30 flex cursor-pointer flex-col items-end gap-2 transition-transform duration-100 active:scale-[0.98] focus-visible:outline-none xl:bottom-5 xl:right-5"
    >
      {/* A speech bubble above the face, with the tail pointing down at it:
          the tail is what says the line is being said by the creature under
          it, and the fixed width keeps the bubble from breathing in and out
          as the sentence types. */}
      {/* Phones get the face alone: at that width a two-line bubble sat over
          the page's own buttons for as long as the page was open. */}
      <span className="panel-chrome relative hidden w-[min(17rem,calc(100vw-1.5rem))] rounded-lg rounded-br-[6px] border border-border bg-surface/85 px-4 py-2.5 text-left shadow-2xl backdrop-blur-xl transition-colors group-hover:border-foreground/30 group-focus-visible:ring-2 group-focus-visible:ring-ring sm:block">
        {/* Hidden from the accessibility tree on purpose: a caret that changes
            twenty times a second is a live region nobody asked for, and the
            button already carries its name. */}
        <span aria-hidden="true" className="block max-h-[2.9em] overflow-hidden text-sm leading-[1.45] text-foreground">
          {typed}
          <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-primary align-middle motion-reduce:hidden" />
        </span>
        <span aria-hidden="true" className="panel-chrome absolute -bottom-[7px] right-5 size-3 rotate-45 border-b border-r border-border bg-surface/85 backdrop-blur-xl transition-colors group-hover:border-foreground/30" />
      </span>
      <Blobatar ref={faceRef} name={ASSISTANT_NAME} animate="always" background="circle" size={52} aria-hidden="true" className="mr-1 shrink-0 rounded-full drop-shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-ring sm:group-focus-visible:ring-0" />
    </button>
  );
}
