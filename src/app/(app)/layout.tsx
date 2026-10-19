import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { NAV_ITEMS } from "@/components/layout/nav-items";
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
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:border focus:border-ink focus:bg-surface focus:p-2"
      >
        Skip to content
      </a>
      <AppShell items={items} user={{ name: session.name, email: session.email }}>
        {children}
      </AppShell>
    </PermissionsProvider>
  );
}