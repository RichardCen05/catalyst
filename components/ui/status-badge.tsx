import { AlertTriangle, CheckCircle2, CircleDot, HelpCircle, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function toneFor(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("corroborated") || normalized.includes("supported") || normalized.includes("broad")) return "positive";
  if (normalized.includes("adverse") || normalized.includes("conflict")) return "negative";
  if (normalized.includes("mixed") || normalized.includes("elevated") || normalized.includes("extreme") || normalized.includes("concentrated")) return "attention";
  if (normalized.includes("insufficient") || normalized.includes("unverified")) return "muted";
  return "info";
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = toneFor(status);
  const Icon = tone === "positive" ? CheckCircle2 : tone === "negative" ? AlertTriangle : tone === "attention" ? CircleDot : tone === "muted" ? HelpCircle : MinusCircle;
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11px] font-medium leading-none",
      tone === "positive" && "border-positive/30 bg-positive/10 text-positive",
      tone === "negative" && "border-danger/30 bg-danger/10 text-danger",
      tone === "attention" && "border-attention/30 bg-attention/10 text-attention-foreground",
      tone === "muted" && "border-border bg-muted text-muted-foreground",
      tone === "info" && "border-primary/30 bg-primary/10 text-primary",
      className,
    )}>
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="truncate">{status}</span>
    </span>
  );
}
