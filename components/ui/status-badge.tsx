import { cn } from "@/lib/utils";
import { uiLabel } from "@/lib/ui-labels";

/** How strongly a status speaks for the claim. Greyscale carries no hue, so
 *  strength is told by the fill of the mark: full, half, empty, dashed. */
type Strength = "full" | "half" | "empty" | "open";

function strengthFor(status: string): Strength | null {
  const normalized = status.toLowerCase();
  if (normalized.includes("corroborated") || normalized.includes("supported") || normalized === "leading" || normalized === "primary test") return "full";
  if (normalized.includes("mixed") || normalized === "supporting" || normalized === "plausible") return "half";
  if (normalized.includes("adverse") || normalized.includes("conflict") || normalized === "challenged") return "empty";
  if (normalized.includes("insufficient") || normalized.includes("unverified") || normalized.includes("unrelated") || normalized === "open") return "open";
  return null;
}

export function StrengthMark({ strength, className }: { strength: Strength; className?: string }) {
  return (
    <svg viewBox="0 0 10 10" aria-hidden="true" className={cn("size-2.5 shrink-0", className)}>
      {strength === "full" ? <circle cx="5" cy="5" r="4" fill="currentColor" stroke="currentColor" strokeWidth="1.5" /> : null}
      {strength === "half" ? <><circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M5 1 A4 4 0 0 1 5 9 Z" fill="currentColor" /></> : null}
      {strength === "empty" ? <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" /> : null}
      {strength === "open" ? <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" /> : null}
    </svg>
  );
}

/** A verdict or a pillar reading, in Indonesian. Verdicts carry a strength
 *  mark; descriptive readings (Partisipasi luas, Normal) sit in a quiet
 *  outline badge because they are not better or worse, only different. */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const strength = strengthFor(status);
  const label = uiLabel(status);
  if (strength) {
    return (
      <span className={cn("inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-foreground", className)}>
        <StrengthMark strength={strength} />
        <span className="truncate">{label}</span>
      </span>
    );
  }
  return (
    <span className={cn("inline-flex h-6 max-w-full items-center rounded-lg border border-border px-2 text-xs font-medium text-muted-foreground", className)}>
      <span className="truncate">{label}</span>
    </span>
  );
}
