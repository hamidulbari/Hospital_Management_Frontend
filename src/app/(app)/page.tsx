import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { loadDashboardData } from "@/features/dashboard/data";
import { QuickActions } from "@/features/dashboard/quick-actions";
import { BarList, ColumnChart, KpiCard, Panel, SampleBadge, type Tone } from "@/features/dashboard/widgets";
import { requireSession } from "@/lib/auth/session";
import { weekdayName } from "@/lib/calendar";
import { formatLocalDate } from "@/lib/datetime";
import { getHospital, hospitalNow } from "@/lib/hospital";
import { formatMoney } from "@/lib/money";
import { can } from "@/lib/permissions";

function greeting(time: string): string {
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// The same status has the same colour everywhere on this screen. The label always says what it is.
const STATUS_TONES: Record<string, Tone> = {
  Booked: "sky",
  "Checked in": "teal",
  "In consultation": "violet",
  Completed: "emerald",
  Cancelled: "red",
  "No-show": "amber",
};
const METHOD_TONES: Record<string, Tone> = { Cash: "emerald", UPI: "violet", Card: "sky" };
const DOCTOR_TONES: Tone[] = ["teal", "sky", "violet", "pink", "amber"];

export default async function DashboardPage() {
  const session = await requireSession();
  const [now, hospital] = await Promise.all([hospitalNow(), getHospital()]);

  const showAppointments = can(session.permissions, "appointment.view");
  const showBilling = can(session.permissions, "billing.invoice.view");
  const data = showAppointments || showBilling ? await loadDashboardData(now.today) : null;

  const currency = hospital?.currencyCode || undefined;
  const grouping = currency === "INR" ? "indian" : "international";
  const money = (amount: string) => formatMoney(amount, { currency, grouping });
  const firstName = session.name.split(" ")[0] || session.name;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`${greeting(now.time)}, ${firstName}`}
        description={`${hospital?.name || "HMS"} \u00b7 ${weekdayName(now.today)}, ${formatLocalDate(now.today)}`}
      />

      <QuickActions permissions={session.permissions} />

      {data?.isSample ? (
        <Notice>
          <p className="font-medium">Design preview</p>
          <p className="mt-1">
            The figures below are sample data, not from the hospital. They will show real numbers once the summary is connected.
          </p>
        </Notice>
      ) : null}

      {data && showAppointments ? (
        <section aria-label="Today at a glance">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-headline text-xs font-semibold uppercase tracking-wider text-muted">Today at a glance</h2>
            {data.isSample ? <SampleBadge /> : null}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard tone="sky" label="Appointments today" value={String(data.kpis.appointmentsToday)} caption="All statuses" />
            <KpiCard tone="violet" label="In OPD queue" value={String(data.kpis.inQueue)} caption="Waiting or with a doctor" />
            <KpiCard tone="teal" label="Completed" value={String(data.kpis.completedToday)} caption="Consultations finished" />
            {showBilling ? (
              <KpiCard tone="amber" label="Collected today" value={money(data.kpis.collectedToday)} caption="Payments recorded today" />
            ) : null}
          </div>
        </section>
      ) : null}

      {data && showAppointments ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Panel title="Appointments, last 7 days" sample={data.isSample} tone="sky" className="lg:col-span-8">
            <ColumnChart columns={data.weekly} />
          </Panel>
          <Panel title="Today by status" sample={data.isSample} tone="violet" className="lg:col-span-4">
            <BarList rows={data.statusBreakdown.map((row) => ({ ...row, tone: STATUS_TONES[row.label] ?? "ink" }))} />
          </Panel>

          <Panel title="Coming up" sample={data.isSample} tone="teal" className="lg:col-span-7">
            <ul>
              {data.upcoming.map((item) => (
                <li key={`${item.time}-${item.patient}`} className="flex items-center gap-4 border-b border-accent py-3 first:pt-0 last:border-b-0 last:pb-0">
                  <span className="w-14 font-headline text-lg font-bold text-ink">{item.time}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{item.patient}</span>
                    <span className="block truncate text-xs text-muted">{item.doctor}</span>
                  </span>
                  <span className="text-xs text-muted">{item.type}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="OPD queue" sample={data.isSample} tone="violet" className="lg:col-span-5">
            <ul>
              {data.queue.map((item) => (
                <li key={item.token} className="flex items-center gap-4 border-b border-accent py-3 first:pt-0 last:border-b-0 last:pb-0">
                  <span className="w-12 font-headline text-3xl font-bold leading-none text-violet-700">{item.token}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{item.patient}</span>
                  <span className="text-xs text-muted">{item.status}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Doctor load today" sample={data.isSample} tone="pink" className={showBilling ? "lg:col-span-6" : "lg:col-span-12"}>
            <BarList rows={data.doctorLoad.map((row, index) => ({ ...row, tone: DOCTOR_TONES[index % DOCTOR_TONES.length] }))} />
          </Panel>

          {showBilling ? (
            <Panel title="Collection by method" sample={data.isSample} tone="amber" className="lg:col-span-6">
              <BarList
                rows={data.collectedByMethod.map((row) => ({
                  label: row.label,
                  value: row.share,
                  display: money(row.amount),
                  tone: METHOD_TONES[row.label] ?? "ink",
                }))}
              />
              <p className="mb-2 mt-6 font-headline text-xs font-semibold uppercase tracking-wider text-muted">Invoices today</p>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {data.invoiceCounts.map((item) => (
                  <li key={item.label} className="border border-ink bg-section-soft p-3">
                    <p className="font-headline text-2xl font-bold text-ink">{item.value}</p>
                    <p className="text-xs text-muted">{item.label}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}