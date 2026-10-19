import { EmptyState } from "@/components/ui/empty-state";
import { NoAccess } from "@/components/ui/no-access";
import { ErrorNotice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { displayRole, groupPermissions, parsePermissions, parseRoles } from "@/features/identity/parse";
import { apiLoad } from "@/lib/api/load";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";

export default async function RolesPage() {
  const session = await requireSession();
  if (!can(session.permissions, "identity.role.view")) return <NoAccess />;

  const [rolesResult, permissionsResult] = await Promise.all([
    apiLoad<unknown>("/identity/roles"),
    apiLoad<unknown>("/identity/permissions"),
  ]);
  if (!rolesResult.ok) return <ErrorNotice error={rolesResult.error} />;

  const roles = parseRoles(rolesResult.data);
  const permissions = permissionsResult.ok ? parsePermissions(permissionsResult.data) : [];

  return (
    <>
      <PageHeader title="Roles and permissions" description="What each role may do. Read only: the roles come with the system. Give a role to a person on the user's page." />

      <div className="flex flex-col gap-10">
        <Section title="Roles">
          {roles.length === 0 ? (
            <EmptyState title="No roles" description="No roles were found." />
          ) : (
            <ul className="flex flex-col gap-3">
              {roles.map((role) => (
                <li key={role.id || role.name}>
                  <details className="border border-ink bg-surface">
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 bg-section-soft p-4">
                      <span className="font-headline text-sm font-bold uppercase tracking-wider text-ink">{displayRole(role.name)}</span>
                      <span className="text-xs text-muted">
                        {role.permissions.length} {role.permissions.length === 1 ? "permission" : "permissions"}
                        {role.description ? ` \u00b7 ${role.description}` : ""}
                      </span>
                    </summary>
                    <div className="flex flex-col gap-4 border-t border-ink p-4">
                      {role.permissions.length === 0 ? <p className="text-sm text-muted">No permissions yet.</p> : null}
                      {groupPermissions(role.permissions).map((group) => (
                        <div key={group.module}>
                          <p className="mb-2 font-headline text-xs font-semibold uppercase tracking-wider text-muted">{group.module}</p>
                          <ul className="flex flex-wrap gap-2">
                            {group.codes.map((code) => (
                              <li key={code} className="border border-ink bg-background px-2 py-1 text-xs text-ink">{code}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {permissions.length > 0 ? (
          <Section title="All permissions">
            <div className="overflow-x-auto border border-ink bg-surface">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ink font-headline text-xs uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="p-3">Code</th>
                    <th scope="col" className="p-3">What it allows</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((permission) => (
                    <tr key={permission.code} className="border-b border-accent last:border-b-0">
                      <td className="p-3 font-medium">{permission.code}</td>
                      <td className="p-3 text-muted">{permission.description || "\u2014"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        ) : null}
      </div>
    </>
  );
}