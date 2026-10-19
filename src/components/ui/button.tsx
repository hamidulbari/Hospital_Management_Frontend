import clsx from "clsx";
import type { ComponentProps } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger";
export type ButtonSize = "md" | "sm";
type Props = ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize; loading?: boolean };

const styles: Record<ButtonVariant, string> = {
  // The main button takes the colour of the part of the app (black where there is none).
  primary: "border-section bg-section text-white hover:border-ink hover:bg-ink",
  secondary: "border-ink bg-surface text-ink hover:border-section hover:bg-section-soft",
  danger: "border-error bg-error text-white hover:bg-surface hover:text-error",
};

const sizes: Record<ButtonSize, string> = {
  md: "h-10 px-4 text-sm",
  sm: "h-8 px-3 text-xs",
};

export function buttonClasses(variant: ButtonVariant = "primary", className?: string, size: ButtonSize = "md") {
  return clsx(
    "inline-flex items-center justify-center border font-semibold disabled:cursor-not-allowed disabled:opacity-50",
    sizes[size],
    styles[variant],
    className,
  );
}

export function Button({ variant = "primary", size = "md", loading = false, disabled, className, children, type = "button", ...rest }: Props) {
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonClasses(variant, className, size)} {...rest}>
      {loading ? "Please wait\u2026" : children}
    </button>
  );
}