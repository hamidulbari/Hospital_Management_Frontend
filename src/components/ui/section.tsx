import type { ReactNode } from "react";

export function Section({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-ink pt-4 print:border-t-0 print:pt-0">
      <div className="mb-4 flex items-center justify-between gap-4 print:mb-3 print:border-b print:border-ink print:pb-2">
        <h2 className="flex items-center gap-2 font-headline text-sm font-bold uppercase tracking-wider text-ink">
          <span aria-hidden="true" className="inline-block h-3 w-3 bg-section print:hidden" />
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}