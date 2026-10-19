import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { NoAccess } from "@/components/ui/no-access";
import { ErrorNotice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { UrlPagination } from "@/components/ui/url-pagination";
import { labelFor } from "@/features/patients/options";
import { AddPractitioner } from "@/features/practitioners/add-practitioner";
import { PRACTITIONER_STATUS_OPTIONS, PRACTITIONER_TYPE_OPTIONS, practitionerTone } from "@/features/practitioners/options";
import { parsePractitionerList } from "@/features/practitioners/parse";
import { PractitionerFilters } from "@/features/practitioners/practitioner-filters";
import { loadDepartmentOptions, loadUserOptions } from "@/features/practitioners/server";
import { apiLoad } from "@/lib/api/load";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";

const PAGE_SIZE = 20;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function PractitionersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireSession();
  const p = session.permissions;
  if (!can(p, "practitioner.view")) return <NoAccess />;

  const raw = await searchParams;
  const q = first(raw.q).slice(0, 100);
  const type = PRACTITIONER_TYPE_OPTIONS.some((o) => o.value === first(raw.type)) ? first(raw.type) : "";
  const status = PRACTITIONER_STATUS_OPTIONS.some((o) => o.value === first(raw.status)) ? first(raw.status) : "";
  const pageNumber = Number(first(raw.page));
  const page = Number.isInteger(pageNumber) && pageNumber >= 1 && pageNumber <= 10_000 ? pageNumber : 1;
  const canManage = can(p, "practitioner.manage");

  const [result, departments, users] = await Promise.all([
    apiLoad<unknown>("/practitioners", { query: { q, type, status, per_page: PAGE_SIZE, page } }),
    canManage ? loadDepartmentOptions() : Promise.resolve([]),
    canManage ? loadUserOptions() : Promise.resolve([]),
  ]);
  const list = result.ok ? parsePractitionerList(result.data) : null;

  return (
    <>
      <PageHeader
        title="Practitioners"
        description="Doctors and staff who can have appointments."
        actions={canManage ? <AddPractitioner departments={departments} users={users} /> : undefined}
      />
      <PractitionerFilters q={q} type={type} status={status} />

      {!result.ok ? (
        <ErrorNotice error={result.error} />
      ) : list && list.items.length === 0 ? (
        <EmptyState title="No practitioners" description="None match these filters. Add a practitioner to start booking." />
      ) : list ? (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto border border-ink bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink font-headline text-xs uppercase tracking-wider">
                <tr>
                  <th scope="col" className="p-3">Name</th>
                  <th scope="col" className="p-3">Type</th>
                  <th scope="col" className="p-3">Specialization</th>
                  <th scope="col" className="p-3">Department</th>
                  <th scope="col" className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((item) => (
                  <tr key={item.id} className="border-b border-accent last:border-b-0 hover:bg-accent">
                    <td className="p-3">
                      <Link href={`/admin/practitioners/${item.id}`} prefetch={false} className="font-medium underline">{item.name}</Link>
                    </td>
                    <td className="p-3">{item.type ? labelFor(PRACTITIONER_TYPE_OPTIONS, item.type) : "—"}</td>
                    <td className="p-3">{item.specialization || "—"}</td>
                    <td className="p-3">{item.department || "—"}</td>
                    <td className="p-3">
                      <StatusBadge label={labelFor(PRACTITIONER_STATUS_OPTIONS, item.status)} tone={practitionerTone(item.status)} />
                    </td>
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