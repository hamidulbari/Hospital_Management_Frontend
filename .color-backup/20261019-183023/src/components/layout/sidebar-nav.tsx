"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type SidebarItem = { label: string; href: string; ready: boolean };

export function SidebarNav({ items }: { items: SidebarItem[] }) {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Main">
      <ul className="flex flex-col">
        {items.map((item) => {
          if (!item.ready) {
            return (
              <li key={item.href}>
                <span aria-disabled="true" className="flex items-center justify-between border-l-4 border-transparent px-3 py-2 text-sm text-muted">
                  {item.label}
                  <span className="font-headline text-[10px] uppercase tracking-wider">Soon</span>
                </span>
              </li>
            );
          }
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "block border-l-4 px-3 py-2 text-sm font-medium",
                  active ? "border-primary bg-accent text-ink" : "border-transparent text-ink hover:bg-background",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}