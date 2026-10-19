import type { ReactNode } from "react";

export function Section({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-ink pt-4 print:border-t-0 print:pt-0">
      <div className="mb-4 flex items-center justify-between gap-4 print:mb-3 print:border-b print:border-ink print:pb-2">
        <h2 className="font-headline text-sm font-bold uppercase tracking-wider text-ink">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}