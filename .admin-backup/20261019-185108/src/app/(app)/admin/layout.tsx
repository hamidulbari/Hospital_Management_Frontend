import { TabsNav } from "@/components/ui/tabs-nav";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const p = session.permissions;

  const items = [
    { label: "Overview", href: "/admin" },
    can(p, "practitioner.view") ? { label: "Practitioners", href: "/admin/practitioners" } : null,
  ].filter((item): item is { label: string; href: string } => item !== null);

  return (
    <>
      <TabsNav items={items} label="Administration" />
      {children}
    </>
  );
}