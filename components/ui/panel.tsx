import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <section className={cn("rounded-xl border border-border bg-surface shadow-panel", className)} {...props} />;
}

export function PanelHeader({ title, eyebrow, action }: { title: string; eyebrow?: string; action?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p> : null}
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      {action}
    </div>
  );
}
