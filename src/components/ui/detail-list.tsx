import type { ReactNode } from "react";

export function DetailList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="font-headline text-xs font-semibold uppercase tracking-wider text-muted">{item.label}</dt>
          <dd className="mt-1 text-sm text-ink">{item.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}