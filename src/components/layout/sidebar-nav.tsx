"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { sectionFor } from "@/lib/sections";

export type SidebarItem = { label: string; href: string; ready: boolean };

export function SidebarNav({ items }: { items: SidebarItem[] }) {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Main">
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const section = sectionFor(item.href); // each item carries its own colour

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
                data-section={section}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex items-center gap-3 border-l-4 px-3 py-2 text-sm font-medium text-ink",
                  active ? "border-section bg-section-soft" : "border-transparent hover:bg-section-soft",
                )}
              >
                <span aria-hidden="true" className="inline-block h-2.5 w-2.5 shrink-0 bg-section" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}