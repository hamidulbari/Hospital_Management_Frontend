import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { requireSession } from "@/lib/auth/session";
import { can, canAny, type PermissionCode } from "@/lib/permissions";

type Area = { title: string; description: string; href: string; anyOf: PermissionCode[]; ready: boolean };

const AREAS: Area[] = [
  { title: "Practitioners", description: "Doctors and staff: profile, specializations, credentials, working hours and leave", href: "/admin/practitioners", anyOf: ["practitioner.view"], ready: true },
  { title: "Users", description: "Login accounts, enable or disable, roles", href: "/admin/users", anyOf: ["identity.user.view"], ready: false },
  { title: "Roles and permissions", description: "What each role may do (read only)", href: "/admin/roles", anyOf: ["identity.role.view"], ready: false },
  { title: "Hospital profile", description: "Name, address, GSTIN, timezone", href: "/admin/hospital", anyOf: ["organization.hospital.view"], ready: false },
  { title: "Branches", description: "Hospital branches", href: "/admin/branches", anyOf: ["organization.branch.view"], ready: false },
  { title: "Departments", description: "Clinical and support departments", href: "/admin/departments", anyOf: ["organization.department.view"], ready: false },
  { title: "Audit trail", description: "Who opened or changed what (read only)", href: "/admin/audit", anyOf: ["audit.event.view"], ready: false },
];

export default async function AdminPage() {
  const session = await requireSession();
  const areas = AREAS.filter((area) => canAny(session.permissions, area.anyOf));
  void can;

  return (
    <>
      <PageHeader title="Administration" description="Set up the hospital, its people and their access." />
      {areas.length === 0 ? (
        <p className="text-sm text-muted">You do not have access to any administration area.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area) => (
            <li key={area.href}>
              {area.ready ? (
                <Link href={area.href} prefetch={false} className="flex h-full flex-col gap-2 border border-ink bg-surface p-5 hover:border-primary hover:bg-accent">
                  <span className="font-headline text-lg font-bold text-ink">{area.title}</span>
                  <span className="text-xs text-muted">{area.description}</span>
                </Link>
              ) : (
                <div aria-disabled="true" className="flex h-full flex-col gap-2 border border-accent bg-surface p-5">
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-headline text-lg font-bold text-muted">{area.title}</span>
                    <span className="font-headline text-[10px] font-semibold uppercase tracking-wider text-muted">Soon</span>
                  </span>
                  <span className="text-xs text-muted">{area.description}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}