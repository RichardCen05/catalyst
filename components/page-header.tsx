import type { ReactNode } from "react";

/** Every page opens the same way: the nav label as the title, one sentence on
 *  what the page is for, and at most one action. The title is the name the
 *  sidebar uses, so a reader never meets one section under two names. */
export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="min-w-0 max-w-3xl">
        <h1 className="editorial text-[28px]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
