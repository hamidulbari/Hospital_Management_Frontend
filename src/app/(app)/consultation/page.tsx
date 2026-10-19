import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { NoAccess } from "@/components/ui/no-access";
import { ErrorNotice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { UrlPagination } from "@/components/ui/url-pagination";
import { AppointmentFilters } from "@/features/appointments/appointment-filters";
import { readDayFilters } from "@/features/appointments/filters";
import { ENCOUNTER_STATUS_OPTIONS, ENCOUNTER_TYPE_OPTIONS, clinicalTone } from "@/features/clinical/options";
import { parseEncounterList } from "@/features/clinical/parse";
import { labelFor } from "@/features/patients/options";
import { apiLoad } from "@/lib/api/load";
import { requireSession } from "@/lib/auth/session";
import { formatLocalDate } from "@/lib/datetime";
import { hospitalNow } from "@/lib/hospital";
import { can } from "@/lib/permissions";

const PAGE_SIZE = 20;

export default async function ConsultationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireSession();
  if (!can(session.permissions, "clinical.encounter.view")) return <NoAccess />;

  const now = await hospitalNow();
  const filters = readDayFilters(await searchParams, now.today, ENCOUNTER_STATUS_OPTIONS.map((o) => o.value));
  const result = await apiLoad<unknown>("/encounters", {
    query: { date: filters.date, status: filters.status, per_page: PAGE_SIZE, page: filters.page },
  });
  const list = result.ok ? parseEncounterList(result.data) : null;

  return (
    <>
      <PageHeader title="Consultations" description={formatLocalDate(filters.date)} />
      <AppointmentFilters
        basePath="/consultation"
        today={now.today}
        date={filters.date}
        practitioner=""
        status={filters.status}
        statusOptions={ENCOUNTER_STATUS_OPTIONS}
      />

      {!result.ok ? (
        <ErrorNotice error={result.error} />
      ) : list && list.items.length === 0 ? (
        <EmptyState
          title="No consultations"
          description="An encounter appears here after a doctor starts a consultation from the appointments list."
        />
      ) : list ? (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto border border-ink bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink font-headline text-xs uppercase tracking-wider">
                <tr>
                  <th scope="col" className="p-3">Patient</th>
                  <th scope="col" className="p-3">Type</th>
                  <th scope="col" className="p-3">Doctor</th>
                  <th scope="col" className="p-3">Status</th>
                  <th scope="col" className="p-3"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((item) => (
                  <tr key={item.id} className="border-b border-accent last:border-b-0 hover:bg-accent">
                    <td className="p-3">
                      <p className="font-medium">{item.patientName || "—"}</p>
                      <p className="text-xs text-muted">MRN {item.patientMrn || "—"}</p>
                    </td>
                    <td className="p-3">{item.type ? labelFor(ENCOUNTER_TYPE_OPTIONS, item.type) : "—"}</td>
                    <td className="p-3">{item.practitionerName || "—"}</td>
                    <td className="p-3">
                      <StatusBadge label={labelFor(ENCOUNTER_STATUS_OPTIONS, item.status)} tone={clinicalTone(item.status)} />
                    </td>
                    <td className="p-3 text-right">
                      {/* prefetch off: opening an encounter is an audited read. */}
                      <Link href={`/consultation/${item.id}`} prefetch={false} className={buttonClasses("secondary", undefined, "sm")}>
                        Open
                      </Link>
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