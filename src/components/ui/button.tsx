import clsx from "clsx";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "danger";
type Props = ComponentProps<"button"> & { variant?: Variant; loading?: boolean };

const styles: Record<Variant, string> = {
  primary: "border-primary bg-primary text-white hover:border-primary-dark hover:bg-primary-dark",
  secondary: "border-primary-dark bg-surface text-primary-dark hover:bg-accent",
  danger: "border-error bg-error text-white hover:bg-surface hover:text-error",
};

export function Button({ variant = "primary", loading = false, disabled, className, children, type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        "inline-flex h-10 items-center justify-center border px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...rest}
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}