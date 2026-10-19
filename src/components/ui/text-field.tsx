import { useId, type ComponentProps, type ReactNode } from "react";
import clsx from "clsx";
import { describedBy, FieldShell } from "./field-shell";
import { Input } from "./input";

type Props = Omit<ComponentProps<"input">, "id"> & {
  label: string;
  error?: string;
  hint?: string;
  id?: string;
  /** Optional element inside the field, on the right (for example the show/hide button). */
  trailing?: ReactNode;
};

export function TextField({ label, error, hint, id, trailing, className, ...rest }: Props) {
  const autoId = useId();
  const fieldId = id ?? autoId;

  return (
    <FieldShell id={fieldId} label={label} error={error} hint={hint}>
      <div className="relative">
        <Input
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, { error, hint })}
          className={clsx(trailing ? "pr-12" : undefined, className)}
          {...rest}
        />
        {trailing ? <div className="absolute inset-y-0 right-0 flex items-center">{trailing}</div> : null}
      </div>
    </FieldShell>
  );
}