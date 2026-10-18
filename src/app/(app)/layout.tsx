import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { PermissionsProvider } from "@/components/permissions-provider";
import { requireSession } from "@/lib/auth/session";
import { canAny } from "@/lib/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Re-checked here on purpose: the proxy only looks for the cookie, it cannot know the token is valid.
  const session = await requireSession();
  if (session.mustChangePassword) redirect("/change-password");

  const items = NAV_ITEMS.filter((item) => item.anyOf.length === 0 || canAny(session.permissions, item.anyOf)).map(
    ({ label, href, ready }) => ({ label, href, ready }),
  );

  return (
    <PermissionsProvider permissions={session.permissions}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-10 focus:border focus:border-primary-dark focus:bg-surface focus:p-2"
      >
        Skip to content
      </a>
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="flex flex-col border-b border-primary-dark bg-surface md:min-h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r">
          <div className="border-b border-primary-dark p-6">
            <p className="font-headline text-2xl font-bold tracking-tight text-primary-dark">HMS</p>
          </div>
          <div className="flex-1 p-3">
            <SidebarNav items={items} />
          </div>
          <div className="border-t border-primary-dark p-4 text-sm">
            <p className="font-medium text-ink">{session.name}</p>
            <p className="break-all text-xs text-muted">{session.email}</p>
            <div className="mt-3 flex flex-col gap-2">
              <Link href="/change-password" className="font-medium text-primary-dark underline">
                Change password
              </Link>
              <form action="/api/auth/logout" method="post">
                <Button type="submit" variant="secondary" className="w-full">Sign out</Button>
              </form>
            </div>
          </div>
        </aside>
        <main id="main" className="flex-1 bg-background p-6 md:p-10">
          {children}
        </main>
      </div>
    </PermissionsProvider>
  );
}