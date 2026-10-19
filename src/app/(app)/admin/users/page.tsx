import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { NoAccess } from "@/components/ui/no-access";
import { ErrorNotice, Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { UrlPagination } from "@/components/ui/url-pagination";
import { AddUser } from "@/features/identity/add-user";
import { USER_STATUS_OPTIONS, userTone } from "@/features/identity/options";
import { displayRole, parseUserList } from "@/features/identity/parse";
import { UserFilters } from "@/features/identity/user-filters";
import { labelFor } from "@/features/patients/options";
import { apiLoad } from "@/lib/api/load";
import { requireSession } from "@/lib/auth/session";
import { showInstant } from "@/lib/format-instant";
import { hospitalNow } from "@/lib/hospital";
import { firstParam, readPage } from "@/lib/page-param";
import { can } from "@/lib/permissions";

const PAGE_SIZE = 25;

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireSession();
  const p = session.permissions;
  if (!can(p, "identity.user.view")) return <NoAccess />;

  const raw = await searchParams;
  const page = readPage(raw.page);
  const q = firstParam(raw.q).trim().slice(0, 100);
  const status = USER_STATUS_OPTIONS.some((o) => o.value === firstParam(raw.status)) ? firstParam(raw.status) : "";
  const searching = q.length >= 2; // the server refuses a shorter term

  const [result, now] = await Promise.all([
    apiLoad<unknown>("/identity/users", { query: { q: searching ? q : "", status, per_page: PAGE_SIZE, page } }),
    hospitalNow(),
  ]);
  const list = result.ok ? parseUserList(result.data) : null;

  return (
    <>
      <PageHeader
        title="Users"
        description="Login accounts of the staff. Search by name or email."
        actions={can(p, "identity.user.manage") ? <AddUser /> : undefined}
      />
      <UserFilters q={q} status={status} />
      {q.length === 1 ? (
        <div className="mb-6">
          <Notice>Type at least 2 characters to search. All users are listed until then.</Notice>
        </div>
      ) : null}

      {!result.ok ? (
        <ErrorNotice error={result.error} />
      ) : list && list.items.length === 0 ? (
        <EmptyState title="No users" description={searching || status ? "No user matches these filters." : "No user accounts were found."} />
      ) : list ? (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto border border-ink bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink font-headline text-xs uppercase tracking-wider">
                <tr>
                  <th scope="col" className="p-3">Name</th>
                  <th scope="col" className="p-3">Email</th>
                  <th scope="col" className="p-3">Roles</th>
                  <th scope="col" className="p-3">Last sign-in</th>
                  <th scope="col" className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((user) => (
                  <tr key={user.id} className="border-b border-accent last:border-b-0 hover:bg-section-soft">
                    <td className="p-3">
                      <Link href={`/admin/users/${user.id}`} prefetch={false} className="font-medium underline">{user.name || user.email}</Link>
                    </td>
                    <td className="p-3 break-all">{user.email}</td>
                    <td className="p-3">{user.roles.length > 0 ? user.roles.map((r) => displayRole(r.name)).join(", ") : "\u2014"}</td>
                    <td className="p-3 text-muted">{showInstant(user.lastLoginAt, now.timezone) || "\u2014"}</td>
                    <td className="p-3"><StatusBadge label={labelFor(USER_STATUS_OPTIONS, user.status)} tone={userTone(user.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <UrlPagination page={list.currentPage} lastPage={list.lastPage} total={list.total} pageSize={PAGE_SIZE} />
        </div>
      ) : null}
    </>
  );
}
