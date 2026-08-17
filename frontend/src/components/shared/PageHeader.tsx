import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <section className="border-b border-border bg-white">
      <div className="container-shell flex flex-col gap-4 py-8 md:flex-row md:items-end md:justify-between">
        <div>
          {eyebrow ? <p className="text-sm font-bold uppercase tracking-[0.08em] text-primary">{eyebrow}</p> : null}
          <h1 className="mt-2 max-w-4xl text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
          {description ? <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}
