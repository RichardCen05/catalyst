import { IconAttention, IconConflict, IconNeutral, IconUnknown, IconVerified } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { uiLabel } from "@/lib/ui-labels";

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
  const Icon = tone === "positive" ? IconVerified : tone === "negative" ? IconConflict : tone === "attention" ? IconAttention : tone === "muted" ? IconUnknown : IconNeutral;
  return (
    <span className={cn(
      "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase leading-none tracking-[0.07em]",
      tone === "positive" && "bg-positive-soft text-positive",
      tone === "negative" && "bg-danger-soft text-danger",
      tone === "attention" && "bg-attention-soft text-attention",
      tone === "muted" && "bg-muted text-muted-foreground",
      tone === "info" && "bg-accent-soft text-accent",
      className,
    )}>
      <Icon className="size-3 shrink-0" />
      <span className="truncate">{status}</span>
    </span>
  );
}
