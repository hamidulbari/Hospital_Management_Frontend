import clsx from "clsx";
import type { ComponentProps } from "react";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={clsx(
        "h-10 w-full border border-ink bg-surface px-3 text-sm text-ink placeholder:text-muted hover:border-primary read-only:bg-background disabled:bg-background aria-[invalid=true]:border-2 aria-[invalid=true]:border-error",
        className,
      )}
      {...props}
    />
  );
}