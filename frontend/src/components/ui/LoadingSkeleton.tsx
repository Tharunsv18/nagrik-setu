import { clsx } from "clsx";

export function LoadingSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={clsx("space-y-3", className)} role="status" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="animate-pulse rounded-lg border border-border bg-white p-4">
          <div className="h-4 w-2/3 rounded bg-muted" />
          <div className="mt-3 h-3 w-full rounded bg-muted" />
          <div className="mt-2 h-3 w-4/5 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function InlineLoader({ label = "Loading" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground" role="status">
      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
      {label}
    </span>
  );
}
