import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title?: string; description?: string; action?: ReactNode }) {
  return (
    <header className="mb-4 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="min-w-0 max-w-3xl">
        {title ? <>
          <p className="meta text-primary">{eyebrow}</p>
          <h1 className="editorial mt-3 text-[30px] sm:text-[38px]">{title}</h1>
        </> : <h1 className="editorial text-[30px] text-primary sm:text-[38px]">{eyebrow}</h1>}
        {description ? <p className="mt-2 max-w-2xl text-[13.5px] leading-[1.65] text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}