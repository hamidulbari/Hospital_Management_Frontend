import { TabsNav } from "@/components/ui/tabs-nav";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const p = session.permissions;

  const items = [
    { label: "Overview", href: "/admin" },
    can(p, "practitioner.view") ? { label: "Practitioners", href: "/admin/practitioners" } : null,
    can(p, "identity.user.view") ? { label: "Users", href: "/admin/users" } : null,
    can(p, "identity.role.view") ? { label: "Roles", href: "/admin/roles" } : null,
    can(p, "organization.hospital.view") ? { label: "Hospital", href: "/admin/hospital" } : null,
    can(p, "organization.branch.view") ? { label: "Branches", href: "/admin/branches" } : null,
    can(p, "organization.department.view") ? { label: "Departments", href: "/admin/departments" } : null,
    can(p, "audit.event.view") ? { label: "Audit trail", href: "/admin/audit" } : null,
  ].filter((item): item is { label: string; href: string } => item !== null);

  return (
    <>
      <TabsNav items={items} label="Administration" />
      {children}
    </>
  );
}