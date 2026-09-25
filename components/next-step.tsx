import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Where to go once this screen is done.
 *
 * Every page and every case step ends on one of these, so a reader never has
 * to guess the next move from the sidebar. One primary action, and at most
 * one quieter alternative.
 */
export function NextStep({ title, description, href, action, secondary, className }: {
  title: string;
  description?: string;
  href: string;
  action: string;
  secondary?: { href: string; label: string; tourAction?: string };
  className?: string;
}) {
  return (
    <aside aria-label="Langkah berikutnya" className={cn("mt-8 flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="min-w-0">
        <p className="text-xs font-medium text-subtle-foreground">Langkah berikutnya</p>
        <p className="mt-0.5 text-base font-semibold">{title}</p>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {secondary ? <Link href={secondary.href} data-tour-action={secondary.tourAction} className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{secondary.label}</Link> : null}
        <Link href={href} className="group inline-flex min-h-10 items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-shadow hover:shadow-[0_0_0_3px_var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">{action}<ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" /></Link>
      </div>
    </aside>
  );
}
