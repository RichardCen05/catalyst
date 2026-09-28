import { cn, signedPercent } from "@/lib/utils";

/** The one place the interface spends a hue: the direction of a price. The
 *  arrow and sign carry the meaning on their own, so the colour is a second
 *  channel, never the only one. A move that rounds to nothing is flat: it
 *  printed `▼ −0,0%`, an arrow and a minus for a price that did not fall. */
export function PriceChange({ value, className }: { value: number; className?: string }) {
  // `signedPercent` prints an unsigned zero, so a flat read equals it.
  const text = signedPercent(value);
  const flat = text === signedPercent(0);
  const direction = flat ? "flat" : value > 0 ? "up" : "down";
  return (
    <span className={cn("inline-flex items-center gap-1 font-mono text-sm font-medium tabular-nums", direction === "up" && "text-up", direction === "down" && "text-down", direction === "flat" && "text-muted-foreground", className)}>
      {direction === "up" ? <span aria-hidden="true">▲</span> : direction === "down" ? <span aria-hidden="true">▼</span> : null}
      <span>{text}</span>
    </span>
  );
}
