import { STALE_READING_LABEL } from "@/lib/ui-labels";

/** A commodity reading dated before the daily window (`isStaleReading`). It
 *  stays on the map so the link is visible, and says it is not a cause. */
export function StaleReading({ stale, className }: { stale?: boolean; className?: string }) {
  if (!stale) return null;
  return (
    <span className={className}>
      <span className="inline-flex rounded-full border border-attention-foreground/40 px-2 py-0.5 text-xs text-attention-foreground">
        {STALE_READING_LABEL}
      </span>
    </span>
  );
}
