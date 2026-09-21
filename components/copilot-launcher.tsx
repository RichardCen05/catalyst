"use client";

import { useEffect, useState, type RefObject } from "react";
import { Blobatar } from "@blobatar/react";
import { useGaze } from "@blobatar/react/gaze";
import { ASSISTANT_NAME, buildQuickPrompts } from "@/lib/agent/assistant";
import { useCatalystStore } from "@/lib/store";

/** Typing cadence. Fast enough to finish a prompt before a reader looks away,
 *  slow enough to read as typing rather than as text appearing. */
const TYPE_MS = 42;
const ERASE_MS = 18;
const HOLD_MS = 2600;
/** The pill is one line wide. A longer prompt would type straight past the
 *  clip and take the caret with it, so the line is cut at a word before it
 *  is ever typed — the same cut buildQuickPrompts already makes on a long
 *  headline, one step further in. */
const LINE_MAX = 38;

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
  const setCopilotOpen = useCatalystStore((state) => state.setCopilotOpen);
  const prompts = buildQuickPrompts(profile);
  const [typed, setTyped] = useState("");
  // The eyes follow the pointer, which is what makes a reader notice the thing
  // is an assistant rather than a badge.
  const { ref: faceRef } = useGaze({ travel: 3, lookAt: "pointer" });

  // A prompt list is rebuilt on every render, so the effect keys on the lines
  // themselves rather than on the array's identity — otherwise the typewriter
  // restarts from an empty string on every unrelated store update.
  const key = prompts.map(fit).join("\n");
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
      className="group fixed bottom-[4.25rem] right-3 z-30 flex cursor-pointer flex-col items-end gap-2 focus-visible:outline-none xl:bottom-5 xl:right-5"
    >
      {/* A speech bubble above the face, with the tail pointing down at it:
          the tail is what says the line is being said by the creature under
          it, and the fixed width keeps the bubble from breathing in and out
          as the sentence types. */}
      <span className="relative w-[min(17rem,calc(100vw-1.5rem))] rounded-2xl border border-border bg-surface/95 px-3.5 py-2 text-left shadow-2xl backdrop-blur transition-colors group-hover:border-foreground/30 group-hover:bg-surface group-focus-visible:ring-2 group-focus-visible:ring-ring">
        {/* Hidden from the accessibility tree on purpose: a caret that changes
            twenty times a second is a live region nobody asked for, and the
            button already carries its name. */}
        <span aria-hidden="true" className="block truncate text-[13px] leading-5 text-foreground">
          {typed}
          <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-primary align-middle motion-reduce:hidden" />
        </span>
        <span aria-hidden="true" className="absolute -bottom-[7px] right-5 size-3 rotate-45 border-b border-r border-border bg-surface/95 transition-colors group-hover:border-foreground/30 group-hover:bg-surface" />
      </span>
      <Blobatar ref={faceRef} name={ASSISTANT_NAME} animate="always" background="circle" size={52} aria-hidden="true" className="mr-1 shrink-0 drop-shadow-lg" />
    </button>
  );
}
