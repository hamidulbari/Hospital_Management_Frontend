import type { ReactNode } from "react";

export function Section({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-ink pt-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-headline text-sm font-bold uppercase tracking-wider text-ink">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}