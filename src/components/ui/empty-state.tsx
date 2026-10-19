import type { ReactNode } from "react";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="border border-t-4 border-ink border-t-section bg-surface p-10">
      <h2 className="font-headline text-lg font-bold text-ink">{title}</h2>
      {description ? <p className="mt-2 max-w-prose text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}