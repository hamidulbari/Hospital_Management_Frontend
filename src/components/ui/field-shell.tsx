import type { ReactNode } from "react";

export function describedBy(id: string, parts: { error?: string; hint?: string }): string | undefined {
  const ids = [parts.hint ? `${id}-hint` : null, parts.error ? `${id}-error` : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

export function FieldShell({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-headline text-xs font-semibold uppercase tracking-wider text-ink">
        {label}
      </label>
      {children}
      {hint ? <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p> : null}
      {error ? <p id={`${id}-error`} className="text-xs font-medium text-error">{error}</p> : null}
    </div>
  );
}