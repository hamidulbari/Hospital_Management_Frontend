import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { NoAccess } from "@/components/ui/no-access";
import { ErrorNotice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { UrlPagination } from "@/components/ui/url-pagination";
import { AppointmentFilters } from "@/features/appointments/appointment-filters";
import { AppointmentTable } from "@/features/appointments/appointment-table";
import { readDayFilters } from "@/features/appointments/filters";
import {
  APPOINTMENTS_PAGE_SIZE,
  APPOINTMENT_STATUS_OPTIONS,
  toPractitionerOptions,
} from "@/features/appointments/options";
import { parseAppointmentList } from "@/features/appointments/parse";
import { loadPractitioners } from "@/features/appointments/server";
import { apiLoad } from "@/lib/api/load";
import { requireSession } from "@/lib/auth/session";
import { formatLocalDate } from "@/lib/datetime";
import { hospitalNow } from "@/lib/hospital";
import { can } from "@/lib/permissions";

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireSession();
  if (!can(session.permissions, "appointment.view")) return <NoAccess />;

  const now = await hospitalNow();
  const filters = readDayFilters(await searchParams, now.today, APPOINTMENT_STATUS_OPTIONS.map((o) => o.value));

  const [result, practitioners] = await Promise.all([
    apiLoad<unknown>("/appointments", {
      query: {
        date: filters.date,
        practitioner: filters.practitioner,
        status: filters.status,
        per_page: APPOINTMENTS_PAGE_SIZE,
        page: filters.page,
      },
    }),
    loadPractitioners(),
  ]);

  const canBook = can(session.permissions, "appointment.book");
  const list = result.ok ? parseAppointmentList(result.data, now.timezone) : null;

  return (
    <>
      <PageHeader
        title="Appointments"
        description={formatLocalDate(filters.date)}
        actions={
          canBook ? (
            <div className="flex gap-3">
              <LinkButton href="/appointments/new">Book appointment</LinkButton>
              <LinkButton href="/appointments/walk-in" variant="secondary">Walk-in</LinkButton>
            </div>
          ) : undefined
        }
      />
      <AppointmentFilters
        basePath="/appointments"
        today={now.today}
        date={filters.date}
        practitioner={filters.practitioner}
        status={filters.status}
        practitioners={practitioners.list.length > 0 ? toPractitionerOptions(practitioners.list) : undefined}
        statusOptions={APPOINTMENT_STATUS_OPTIONS}
      />

      {!result.ok ? (
        <ErrorNotice error={result.error} />
      ) : list && list.items.length === 0 ? (
        <EmptyState title="No appointments" description="Nothing is booked for these filters. Change the date or filters, or book a new appointment." />
      ) : list ? (
        <div className="flex flex-col gap-4">
          <AppointmentTable items={list.items} today={now.today} nowTime={now.time} timezone={now.timezone} />
          <UrlPagination page={list.currentPage} lastPage={list.lastPage} total={list.total} pageSize={APPOINTMENTS_PAGE_SIZE} />
        </div>
      ) : null}
    </>
  );
}