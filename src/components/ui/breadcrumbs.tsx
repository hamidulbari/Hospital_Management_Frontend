"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { crumbsFor } from "@/lib/breadcrumbs";

export function Breadcrumbs() {
  const pathname = usePathname() ?? "";
  const crumbs = crumbsFor(pathname);
  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={crumb.href} className="flex items-center gap-2">
              {index > 0 ? <span aria-hidden="true" className="text-muted">/</span> : null}
              {last ? (
                <span aria-current="page" className="font-semibold text-ink">{crumb.label}</span>
              ) : (
                // prefetch off: some of these pages read audited data when they open.
                <Link href={crumb.href} prefetch={false} className="text-muted underline hover:text-primary">
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}