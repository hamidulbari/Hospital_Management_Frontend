import { NoAccess } from "@/components/ui/no-access";
import { ErrorNotice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { UrlPagination } from "@/components/ui/url-pagination";
import { DepartmentsPanel } from "@/features/organization/departments-panel";
import { parseBranches, parseDepartments } from "@/features/organization/parse";
import { apiLoad } from "@/lib/api/load";
import { requireSession } from "@/lib/auth/session";
import { readPage } from "@/lib/page-param";
import { can } from "@/lib/permissions";

const PAGE_SIZE = 50;

export default async function DepartmentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireSession();
  const p = session.permissions;
  if (!can(p, "organization.department.view")) return <NoAccess />;

  const page = readPage((await searchParams).page);
  const canManage = can(p, "organization.department.manage");
  const [result, branchesResult, allResult] = await Promise.all([
    apiLoad<unknown>("/organization/departments", { query: { per_page: PAGE_SIZE, page } }),
    canManage && can(p, "organization.branch.view") ? apiLoad<unknown>("/organization/branches", { query: { per_page: 100 } }) : Promise.resolve(null),
    canManage ? apiLoad<unknown>("/organization/departments", { query: { per_page: 100 } }) : Promise.resolve(null),
  ]);
  if (!result.ok) return <ErrorNotice error={result.error} />;
  const list = parseDepartments(result.data);

  const branches = branchesResult && branchesResult.ok ? parseBranches(branchesResult.data).items.map((b) => ({ value: b.id, label: b.name })) : [];
  const parents = allResult && allResult.ok ? parseDepartments(allResult.data).items.map((d) => ({ value: d.id, label: d.name })) : [];

  return (
    <>
      <PageHeader title="Departments" description="Clinical, diagnostic, support and administrative departments. A department is made inactive, never deleted." />
      <div className="flex flex-col gap-4">
        <DepartmentsPanel items={list.items} branches={branches} parents={parents} canManage={canManage} />
        <UrlPagination page={list.currentPage} lastPage={list.lastPage} total={list.total} pageSize={PAGE_SIZE} />
      </div>
    </>
  );
}