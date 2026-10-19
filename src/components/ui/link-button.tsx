import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClasses, type ButtonVariant } from "./button";

export function LinkButton({ href, variant = "primary", children }: { href: string; variant?: ButtonVariant; children: ReactNode }) {
  return (
    <Link href={href} className={buttonClasses(variant)}>
      {children}
    </Link>
  );
}