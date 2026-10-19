import { useId } from "react";
import { describedBy, FieldShell } from "./field-shell";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  id?: string;
  maxLength?: number;
  rows?: number;
};

export function TextareaField({ label, value, onChange, error, hint, id, maxLength, rows = 3 }: Props) {
  const autoId = useId();
  const fieldId = id ?? autoId;

  return (
    <FieldShell id={fieldId} label={label} error={error} hint={hint}>
      <textarea
        id={fieldId}
        rows={rows}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, { error, hint })}
        className="w-full border border-ink bg-surface px-3 py-2 text-sm text-ink hover:border-primary aria-[invalid=true]:border-2 aria-[invalid=true]:border-error"
      />
    </FieldShell>
  );
}