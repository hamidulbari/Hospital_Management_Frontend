import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { requireSession } from "@/lib/auth/session";
import { canAny, type PermissionCode } from "@/lib/permissions";

type Area = { title: string; description: string; href: string; anyOf: PermissionCode[] };

const AREAS: Area[] = [
  { title: "Practitioners", description: "Doctors and staff: profile, specializations, credentials, working hours and leave", href: "/admin/practitioners", anyOf: ["practitioner.view"] },
  { title: "Users", description: "Login accounts: create, enable or disable, give roles", href: "/admin/users", anyOf: ["identity.user.view"] },
  { title: "Roles and permissions", description: "What each role may do (read only)", href: "/admin/roles", anyOf: ["identity.role.view"] },
  { title: "Hospital profile", description: "Name, address, GSTIN, timezone: printed on bills", href: "/admin/hospital", anyOf: ["organization.hospital.view"] },
  { title: "Branches", description: "Hospital branches", href: "/admin/branches", anyOf: ["organization.branch.view"] },
  { title: "Departments", description: "Clinical, diagnostic and support departments", href: "/admin/departments", anyOf: ["organization.department.view"] },
  { title: "Audit trail", description: "Who opened or changed what (read only)", href: "/admin/audit", anyOf: ["audit.event.view"] },
];

export default async function AdminPage() {
  const session = await requireSession();
  const areas = AREAS.filter((area) => canAny(session.permissions, area.anyOf));

  return (
    <>
      <PageHeader title="Administration" description="Set up the hospital, its people and their access." />
      {areas.length === 0 ? (
        <p className="text-sm text-muted">You do not have access to any administration area.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area) => (
            <li key={area.href}>
              <Link href={area.href} prefetch={false} className="flex h-full flex-col gap-2 border border-t-4 border-ink border-t-section bg-surface p-5 hover:bg-section-soft">
                <span className="font-headline text-lg font-bold text-ink">{area.title}</span>
                <span className="text-xs text-muted">{area.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}