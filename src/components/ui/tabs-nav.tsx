"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function TabsNav({ items, label }: { items: { label: string; href: string }[]; label: string }) {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label={label} className="mb-6 flex flex-wrap gap-2">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "border px-4 py-2 text-sm font-semibold",
              active ? "border-ink bg-ink text-white" : "border-ink bg-surface text-ink hover:border-primary hover:bg-accent",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}