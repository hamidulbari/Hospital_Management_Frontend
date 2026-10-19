import { ErrorNotice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { APPOINTMENT_STATUS_OPTIONS } from "@/features/appointments/options";
import { INVOICE_STATUS_OPTIONS, PAYMENT_METHOD_OPTIONS } from "@/features/billing/options";
import { loadDashboard } from "@/features/dashboard/server";
import { QuickActions } from "@/features/dashboard/quick-actions";
import { BarList, ColumnChart, KpiCard, Panel, type Tone } from "@/features/dashboard/widgets";
import { labelFor } from "@/features/patients/options";
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
  booked: "sky",
  checked_in: "teal",
  in_consultation: "violet",
  completed: "emerald",
  cancelled: "red",
  no_show: "amber",
};
const METHOD_TONES: Record<string, Tone> = { cash: "emerald", upi: "violet", card: "sky" };
const DOCTOR_TONES: Tone[] = ["teal", "sky", "violet", "pink", "amber"];

function CountBoxes({ items }: { items: { label: string; value: number }[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <li key={item.label} className="border border-ink bg-section-soft p-3">
          <p className="font-headline text-2xl font-bold text-ink">{item.value}</p>
          <p className="text-xs text-muted">{item.label}</p>
        </li>
      ))}
    </ul>
  );
}

export default async function DashboardPage() {
  const session = await requireSession();
  const [now, hospital] = await Promise.all([hospitalNow(), getHospital()]);

  const result = can(session.permissions, "dashboard.view") ? await loadDashboard() : null;
  const data = result && result.ok ? result.data : null;

  const currency = data?.currency || hospital?.currencyCode || undefined;
  const grouping = currency === "INR" ? "indian" : "international";
  const money = (amount: string) => (amount ? formatMoney(amount, { currency, grouping }) : "\u2014");
  const firstName = session.name.split(" ")[0] || session.name;
  const today = data?.date || now.today;

  const a = data?.appointments ?? null;
  const q = data?.queue ?? null;
  const c = data?.clinical ?? null;
  const b = data?.billing ?? null;
  const p = data?.patients ?? null;

  const kpis: { label: string; value: string; caption: string; tone: Tone }[] = [];
  if (a) kpis.push({ label: "Appointments today", value: String(a.total), caption: "Cancelled ones are not counted", tone: "sky" });
  if (q) kpis.push({ label: "In OPD queue", value: String(q.waiting + q.inConsultation), caption: "Waiting or with a doctor", tone: "violet" });
  if (a) kpis.push({ label: "Completed", value: String(a.byStatus.find((s) => s.status === "completed")?.count ?? 0), caption: "Appointments finished today", tone: "teal" });
  if (p) kpis.push({ label: "Registered today", value: String(p.registeredToday), caption: "New patients", tone: "pink" });
  if (c) kpis.push({ label: "Open encounters", value: String(c.openNow), caption: "Consultations in progress", tone: "violet" });
  if (b) kpis.push({ label: "Collected today", value: money(b.collectedToday), caption: "Payments recorded today", tone: "amber" });
  if (b) kpis.push({ label: "Outstanding", value: money(b.outstanding), caption: "Unpaid on issued invoices", tone: "red" });

  const allShares = b !== null && b.byMethod.length > 0 && b.byMethod.every((row) => row.share !== null);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`${greeting(now.time)}, ${firstName}`}
        description={`${hospital?.name || "HMS"} \u00b7 ${weekdayName(now.today)}, ${formatLocalDate(now.today)}`}
      />

      <QuickActions permissions={session.permissions} />

      {result && !result.ok ? <ErrorNotice error={result.error} /> : null}

      {kpis.length > 0 ? (
        <section aria-label="Today at a glance">
          <h2 className="mb-3 font-headline text-xs font-semibold uppercase tracking-wider text-muted">Today at a glance</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => (
              <KpiCard key={kpi.label} tone={kpi.tone} label={kpi.label} value={kpi.value} caption={kpi.caption} />
            ))}
          </div>
        </section>
      ) : null}

      {data ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {a && a.last7.length > 0 ? (
            <Panel title="Appointments, last 7 days" tone="sky" className="lg:col-span-8">
              <ColumnChart
                columns={a.last7.map((day, index, all) => ({
                  label: weekdayName(day.date).slice(0, 3),
                  value: day.count,
                  highlight: index === all.length - 1,
                }))}
              />
            </Panel>
          ) : null}
          {a ? (
            <Panel title="Today by status" tone="violet" className="lg:col-span-4">
              <BarList
                rows={a.byStatus.map((row) => ({
                  label: labelFor(APPOINTMENT_STATUS_OPTIONS, row.status),
                  value: row.count,
                  tone: STATUS_TONES[row.status] ?? "ink",
                }))}
              />
            </Panel>
          ) : null}

          {q ? (
            <Panel title="OPD queue today" tone="violet" className="lg:col-span-6">
              <CountBoxes
                items={[
                  { label: "Waiting", value: q.waiting },
                  { label: "With a doctor", value: q.inConsultation },
                  { label: "Completed", value: q.completed },
                  { label: "Skipped", value: q.skipped },
                ]}
              />
            </Panel>
          ) : null}
          {c ? (
            <Panel title="Consultations today" tone="teal" className="lg:col-span-6">
              <CountBoxes
                items={[
                  { label: "Opened today", value: c.opened },
                  { label: "Finished today", value: c.finished },
                  { label: "Open now", value: c.openNow },
                ]}
              />
            </Panel>
          ) : null}

          {a && a.byPractitioner.length > 0 ? (
            <Panel title="Doctor load today" tone="pink" className="lg:col-span-6">
              <BarList rows={a.byPractitioner.map((row, index) => ({ label: row.name || "\u2014", value: row.count, tone: DOCTOR_TONES[index % DOCTOR_TONES.length] }))} />
            </Panel>
          ) : null}

          {b ? (
            <Panel title="Collection by method" tone="amber" className="lg:col-span-6">
              {b.byMethod.length === 0 ? (
                <p className="text-sm text-muted">Nothing collected today.</p>
              ) : allShares ? (
                <BarList
                  rows={b.byMethod.map((row) => ({
                    label: labelFor(PAYMENT_METHOD_OPTIONS, row.method),
                    value: row.share ?? 0,
                    display: money(row.amount),
                    tone: METHOD_TONES[row.method] ?? "ink",
                  }))}
                />
              ) : (
                <ul>
                  {b.byMethod.map((row) => (
                    <li key={row.method} className="flex items-baseline justify-between gap-3 border-b border-accent py-2 text-sm first:pt-0 last:border-b-0 last:pb-0">
                      <span className="text-ink">{labelFor(PAYMENT_METHOD_OPTIONS, row.method)}</span>
                      <span className="font-headline font-bold text-ink">{money(row.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          ) : null}
          {b ? (
            <Panel title="Invoices today" tone="amber" className="lg:col-span-6">
              {b.invoicesToday.length === 0 ? (
                <p className="text-sm text-muted">No invoice was created today.</p>
              ) : (
                <CountBoxes items={b.invoicesToday.map((row) => ({ label: labelFor(INVOICE_STATUS_OPTIONS, row.status), value: row.count }))} />
              )}
            </Panel>
          ) : null}
          {b && b.last7.length > 0 ? (
            <Panel title="Collected, last 7 days" tone="amber" className="lg:col-span-6">
              <ul>
                {b.last7.map((day) => (
                  <li key={day.date} className="flex items-baseline justify-between gap-3 border-b border-accent py-2 text-sm first:pt-0 last:border-b-0 last:pb-0">
                    <span className={day.date === today ? "font-semibold text-ink" : "text-muted"}>{weekdayName(day.date)}, {formatLocalDate(day.date)}</span>
                    <span className="font-headline font-bold text-ink">{money(day.amount)}</span>
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
