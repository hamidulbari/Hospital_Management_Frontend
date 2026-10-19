import { EmptyState } from "@/components/ui/empty-state";
import { NoAccess } from "@/components/ui/no-access";
import { ErrorNotice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { RefreshButton } from "@/components/ui/refresh-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { AppointmentFilters } from "@/features/appointments/appointment-filters";
import { readDayFilters } from "@/features/appointments/filters";
import { QUEUE_STATUS_OPTIONS, statusTone } from "@/features/appointments/options";
import { parseQueue } from "@/features/appointments/parse";
import { labelFor } from "@/features/patients/options";
import { apiLoad } from "@/lib/api/load";
import { requireSession } from "@/lib/auth/session";
import { formatLocalDate } from "@/lib/datetime";
import { hospitalNow } from "@/lib/hospital";
import { can } from "@/lib/permissions";

export default async function QueuePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireSession();
  if (!can(session.permissions, "appointment.view")) return <NoAccess />;

  const now = await hospitalNow();
  const filters = readDayFilters(await searchParams, now.today, QUEUE_STATUS_OPTIONS.map((o) => o.value));
  const result = await apiLoad<unknown>("/queue", { query: { date: filters.date, status: filters.status } });
  const items = result.ok ? parseQueue(result.data) : [];

  const summary = QUEUE_STATUS_OPTIONS.map((option) => ({
    label: option.label,
    count: items.filter((item) => item.status === option.value).length,
  }))
    .filter((entry) => entry.count > 0)
    .map((entry) => `${entry.count} ${entry.label.toLowerCase()}`)
    .join(" · ");

  return (
    <>
      <PageHeader
        title="OPD queue"
        description={`${formatLocalDate(filters.date)}${summary ? ` · ${summary}` : ""}`}
        actions={<RefreshButton updatedAt={now.time} />}
      />
      <AppointmentFilters
        basePath="/appointments/queue"
        today={now.today}
        date={filters.date}
        practitioner=""
        status={filters.status}
        statusOptions={QUEUE_STATUS_OPTIONS}
      />
      <p className="mb-4 text-xs text-muted">
        This screen does not refresh by itself: every view of the queue is written to the audit trail. Press Refresh to update.
      </p>

      {!result.ok ? (
        <ErrorNotice error={result.error} />
      ) : items.length === 0 ? (
        <EmptyState title="The queue is empty" description="Patients appear here after they are checked in." />
      ) : (
        <div className="overflow-x-auto border border-ink bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink font-headline text-xs uppercase tracking-wider">
              <tr>
                <th scope="col" className="p-3">Token</th>
                <th scope="col" className="p-3">Patient</th>
                <th scope="col" className="p-3">Doctor</th>
                <th scope="col" className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-accent last:border-b-0 hover:bg-accent">
                  <td className="p-3 font-headline text-3xl font-bold">{item.token ?? "—"}</td>
                  <td className="p-3">
                    <p className="font-medium">{item.patientName || "—"}</p>
                    <p className="text-xs text-muted">MRN {item.patientMrn || "—"}</p>
                  </td>
                  <td className="p-3">{item.practitionerName || "—"}</td>
                  <td className="p-3">
                    <StatusBadge label={labelFor(QUEUE_STATUS_OPTIONS, item.status)} tone={statusTone(item.status)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}