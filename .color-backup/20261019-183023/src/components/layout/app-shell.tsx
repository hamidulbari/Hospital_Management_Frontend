"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { SidebarNav, type SidebarItem } from "./sidebar-nav";

type User = { name: string; email: string };

function UserBlock({ user }: { user: User }) {
  return (
    <div className="text-sm">
      <p className="font-medium text-ink">{user.name}</p>
      <p className="break-all text-xs text-muted">{user.email}</p>
      <div className="mt-3 flex flex-col gap-2">
        <Link href="/change-password" className="font-medium text-ink underline hover:text-primary">
          Change password
        </Link>
        <form action="/api/auth/logout" method="post">
          <Button type="submit" variant="secondary" className="w-full">Sign out</Button>
        </form>
      </div>
    </div>
  );
}

export function AppShell({ items, user, children }: { items: SidebarItem[]; user: User; children: ReactNode }) {
  const pathname = usePathname() ?? "";
  // The menu is "open for this page". Moving to another page closes it by itself.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Phone and small tablet: a top bar with a Menu button. */}
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-ink bg-surface px-4 md:hidden">
        <p className="font-headline text-xl font-bold tracking-tight text-ink">HMS</p>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? "mobile-menu" : undefined}
          onClick={() => setOpenPath(open ? null : pathname)}
          className="h-10 border border-ink px-4 text-sm font-semibold text-ink hover:border-primary hover:bg-accent"
        >
          {open ? "Close" : "Menu"}
        </button>
      </header>

      {open ? (
        <div id="mobile-menu" className="fixed inset-x-0 bottom-0 top-14 z-30 flex flex-col overflow-y-auto bg-surface md:hidden">
          <div className="flex-1 p-3">
            <SidebarNav items={items} />
          </div>
          <div className="border-t border-ink p-4">
            <UserBlock user={user} />
          </div>
        </div>
      ) : null}

      {/* Wide screens: fixed sidebar. Only the menu in the middle scrolls, so Sign out is always visible. */}
      <aside className="hidden border-ink bg-surface md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:self-start md:border-r">
        <div className="shrink-0 border-b border-ink p-6">
          <p className="font-headline text-2xl font-bold tracking-tight text-ink">HMS</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <SidebarNav items={items} />
        </div>
        <div className="shrink-0 border-t border-ink p-4">
          <UserBlock user={user} />
        </div>
      </aside>

      <main id="main" className="min-w-0 flex-1 bg-background p-4 sm:p-6 md:p-10">
        {/* Content stays next to the sidebar and stops growing on very wide screens. */}
        <div className="w-full ">
          <Breadcrumbs />
          {children}
        </div>
      </main>
    </div>
  );
}