import clsx from "clsx";
import type { ComponentProps } from "react";

export function CheckboxField({ label, className, ...rest }: ComponentProps<"input"> & { label: string }) {
  return (
    <label className={clsx("flex items-center gap-2 text-sm text-ink", className)}>
      <input type="checkbox" className="h-4 w-4 accent-ink" {...rest} />
      {label}
    </label>
  );
}