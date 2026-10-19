import clsx from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={clsx("animate-pulse bg-accent", className)} />;
}

/** Placeholder shaped like a page: a header and a table. Shown while a page loads. */
export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading">
      <span className="sr-only">Loading…</span>
      <div className="mb-8 border-b border-ink pb-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      </div>
      <div className="border border-ink bg-surface">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex gap-4 border-b border-accent p-4 last:border-b-0">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}