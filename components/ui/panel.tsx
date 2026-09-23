import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <section className={cn("relative rounded-lg border border-border bg-background transition-shadow hover:shadow-[0_10px_28px_-16px_rgb(0_0_0/0.22)]", className)} {...props} />;
}

/** A card's title row: one title, one optional action. No label above it;
 *  the title says what the card is. */
export function PanelHeader({ title, action, titleId }: { title: string; action?: ReactNode; titleId?: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4 border-b border-border px-5 py-4">
      <h2 id={titleId} className="editorial min-w-0 text-base text-foreground">{title}</h2>
      {action}
    </div>
  );
}
