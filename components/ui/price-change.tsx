import { cn } from "@/lib/utils";

const percent = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** The one place the interface spends a hue: the direction of a price. The
 *  arrow and sign carry the meaning on their own, so the colour is a second
 *  channel, never the only one. */
export function PriceChange({ value, className }: { value: number; className?: string }) {
  const direction = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const sign = direction === "up" ? "+" : direction === "down" ? "−" : "";
  return (
    <span className={cn("inline-flex items-center gap-1 font-mono text-sm font-medium tabular-nums", direction === "up" && "text-up", direction === "down" && "text-down", direction === "flat" && "text-muted-foreground", className)}>
      {direction === "up" ? <span aria-hidden="true">▲</span> : direction === "down" ? <span aria-hidden="true">▼</span> : null}
      <span>{sign}{percent.format(Math.abs(value))}%</span>
    </span>
  );
}
