import { NoAccess } from "@/components/ui/no-access";
import { ErrorNotice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { UrlPagination } from "@/components/ui/url-pagination";
import { BranchesPanel } from "@/features/organization/branches-panel";
import { parseBranches } from "@/features/organization/parse";
import { apiLoad } from "@/lib/api/load";
import { requireSession } from "@/lib/auth/session";
import { readPage } from "@/lib/page-param";
import { can } from "@/lib/permissions";

const PAGE_SIZE = 50;

export default async function BranchesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireSession();
  const p = session.permissions;
  if (!can(p, "organization.branch.view")) return <NoAccess />;

  const page = readPage((await searchParams).page);
  const result = await apiLoad<unknown>("/organization/branches", { query: { per_page: PAGE_SIZE, page } });
  if (!result.ok) return <ErrorNotice error={result.error} />;
  const list = parseBranches(result.data);

  return (
    <>
      <PageHeader title="Branches" description="The branches of the hospital. A branch is made inactive, never deleted." />
      <div className="flex flex-col gap-4">
        <BranchesPanel items={list.items} canManage={can(p, "organization.branch.manage")} />
        <UrlPagination page={list.currentPage} lastPage={list.lastPage} total={list.total} pageSize={PAGE_SIZE} />
      </div>
    </>
  );
}