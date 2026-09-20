import { cn } from "@/lib/utils";

const sizeClasses = { sm: "size-6 text-[9px]", md: "size-8 text-[10px]", lg: "size-10 text-xs" } as const;

/** Placeholder mark until real emiten logos are wired up (needs Sectors API key + a confirmed logo field). */
export function TickerAvatar({ symbol, size = "md", className }: { symbol: string; size?: keyof typeof sizeClasses; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("grid shrink-0 place-items-center rounded-full bg-primary/10 font-mono font-semibold uppercase tracking-tight text-primary", sizeClasses[size], className)}
    >
      {symbol.slice(0, 2)}
    </span>
  );
}
