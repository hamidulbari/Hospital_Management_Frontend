import clsx from "clsx";
import type { ComponentProps } from "react";

/**
 * A sharp checkbox. The browser's own checkbox ignores border-radius, so it is hidden (appearance-none)
 * and drawn here: a square with a black border, filled black with a white tick when checked.
 */
export function CheckboxField({ label, className, ...rest }: ComponentProps<"input"> & { label: string }) {
  return (
    <label className={clsx("flex cursor-pointer items-center gap-2 text-sm text-ink", className)}>
      <span className="relative inline-flex h-5 w-5 shrink-0">
        <input
          type="checkbox"
          className="peer h-5 w-5 cursor-pointer appearance-none border border-ink bg-surface checked:bg-ink hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
          {...rest}
        />
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="square"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden h-5 w-5 text-white peer-checked:block"
        >
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
      </span>
      {label}
    </label>
  );
}