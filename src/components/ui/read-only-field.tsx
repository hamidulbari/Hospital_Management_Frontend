import { useId } from "react";
import { FieldShell } from "./field-shell";

/** A value that is shown, never typed. It is not a form control, so the Tab key skips it. */
export function ReadOnlyField({ label, value, hint, id }: { label: string; value: string; hint?: string; id?: string }) {
  const autoId = useId();
  const fieldId = id ?? autoId;

  return (
    <FieldShell id={fieldId} label={label} hint={hint}>
      <output id={fieldId} className="flex h-10 w-full items-center border border-accent bg-background px-3 text-sm font-medium text-ink">
        {value || "—"}
      </output>
    </FieldShell>
  );
}