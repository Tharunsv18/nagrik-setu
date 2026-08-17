import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { ButtonLink } from "./Button";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionTo,
  children,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-white p-6 text-center">
      <Inbox aria-hidden="true" className="mx-auto mb-3 text-muted-foreground" size={34} />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      {actionLabel && actionTo ? (
        <ButtonLink to={actionTo} className="mt-4">
          {actionLabel}
        </ButtonLink>
      ) : null}
      {children}
    </div>
  );
}
