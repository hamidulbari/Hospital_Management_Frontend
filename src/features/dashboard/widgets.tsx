import clsx from "clsx";
import type { ReactNode } from "react";

export function SampleBadge() {
  return (
    <span className="border border-ink px-2 py-1 font-headline text-[10px] font-semibold uppercase tracking-wider text-ink">
      Sample data
    </span>
  );
}

export function Panel({ title, sample = false, className, children }: { title: string; sample?: boolean; className?: string; children: ReactNode }) {
  return (
    <section className={clsx("border border-ink bg-surface", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-ink px-5 py-3">
        <h2 className="font-headline text-sm font-bold uppercase tracking-wider text-ink">{title}</h2>
        {sample ? <SampleBadge /> : null}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function KpiCard({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div className="border border-ink bg-surface p-5">
      <p className="font-headline text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-4 whitespace-nowrap font-headline text-4xl font-bold leading-none tracking-tight text-ink">{value}</p>
      <p className="mt-3 text-xs text-muted">{caption}</p>
    </div>
  );
}

/** Horizontal bars. The width is relative to the largest row. */
export function BarList({ rows }: { rows: { label: string; value: number; display?: string }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-ink">{row.label}</span>
            <span className="font-headline font-bold text-ink">{row.display ?? row.value}</span>
          </div>
          <div aria-hidden="true" className="mt-1 h-2 bg-background">
            <div className="h-full bg-ink" style={{ width: `${Math.round((row.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Vertical bars with the value above and the label below. The highlighted one is blue. */
export function ColumnChart({ columns }: { columns: { label: string; value: number; highlight?: boolean }[] }) {
  const max = Math.max(1, ...columns.map((column) => column.value));
  return (
    <ul className="flex h-52 items-stretch gap-3">
      {columns.map((column) => (
        <li key={column.label} className="flex flex-1 flex-col text-center">
          <span className="mb-1 text-xs font-semibold text-ink">{column.value}</span>
          <div className="flex flex-1 items-end">
            <div
              aria-hidden="true"
              className={clsx("w-full", column.highlight ? "bg-primary" : "bg-ink")}
              style={{ height: `${Math.max(2, Math.round((column.value / max) * 100))}%` }}
            />
          </div>
          <span className="mt-2 text-xs text-muted">{column.label}</span>
        </li>
      ))}
    </ul>
  );
}