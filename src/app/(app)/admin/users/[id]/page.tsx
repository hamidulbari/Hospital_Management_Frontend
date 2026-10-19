import { notFound } from "next/navigation";
import { DetailList } from "@/components/ui/detail-list";
import { LinkButton } from "@/components/ui/link-button";
import { NoAccess } from "@/components/ui/no-access";
import { ErrorNotice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { StatusBadge } from "@/components/ui/status-badge";
import { EditUser } from "@/features/identity/edit-user";
import { USER_STATUS_OPTIONS, userTone } from "@/features/identity/options";
import { parseRoles, parseUser } from "@/features/identity/parse";
import { UserRoles } from "@/features/identity/user-roles";
import { UserStatus } from "@/features/identity/user-status";
import { labelFor } from "@/features/patients/options";
import { apiLoad } from "@/lib/api/load";
import { requireSession } from "@/lib/auth/session";
import { showInstant } from "@/lib/format-instant";
import { hospitalNow } from "@/lib/hospital";
import { can } from "@/lib/permissions";

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  if (!/^[0-9a-z]{26}$/i.test(id)) notFound();
  const p = session.permissions;
  if (!can(p, "identity.user.view")) return <NoAccess />;

  const [result, rolesResult, now] = await Promise.all([
    apiLoad<unknown>(`/identity/users/${id}`),
    can(p, "identity.role.view") ? apiLoad<unknown>("/identity/roles") : Promise.resolve(null),
    hospitalNow(),
  ]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    if (result.error.status === 403) return <NoAccess />;
    return <ErrorNotice error={result.error} />;
  }

  const user = parseUser(result.data);
  const roles = rolesResult && rolesResult.ok ? parseRoles(rolesResult.data) : [];
  const isSelf = user.id === session.id || id === session.id;
  const canManage = can(p, "identity.user.manage");

  return (
    <>
      <PageHeader
        title={user.name || user.email || "User"}
        description={user.email}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge label={labelFor(USER_STATUS_OPTIONS, user.status)} tone={userTone(user.status)} />
            {canManage ? <EditUser user={user} /> : null}
            {canManage ? <UserStatus userId={id} status={user.status} isSelf={isSelf} /> : null}
            <LinkButton href="/admin/users" variant="secondary">All users</LinkButton>
          </div>
        }
      />

      <div className="flex flex-col gap-10">
        <Section title="Account">
          <DetailList
            items={[
              { label: "Email", value: user.email },
              { label: "Phone", value: user.phone },
              { label: "Last sign-in", value: showInstant(user.lastLoginAt, now.timezone) },
              { label: "Password", value: user.mustChangePassword ? "Must be changed at the next sign-in" : "" },
            ]}
          />
        </Section>

        <Section title="Roles">
          <UserRoles userId={id} current={user.roles} all={roles} canAssign={can(p, "identity.user.assign_roles")} isSelf={isSelf} />
        </Section>
      </div>
    </>
  );
}