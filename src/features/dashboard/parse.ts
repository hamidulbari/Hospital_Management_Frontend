import { list, num, rec, str } from "@/lib/utils/guards";
import { nameOf } from "@/lib/utils/names";

export type StatusCount = { status: string; count: number };
export type DayCount = { date: string; count: number };
export type DayAmount = { date: string; amount: string };
export type MethodAmount = { method: string; amount: string; share: number | null };

export type Dashboard = {
  date: string;
  timezone: string;
  currency: string;
  patients: { registeredToday: number } | null;
  appointments: { total: number; byStatus: StatusCount[]; byPractitioner: { name: string; count: number }[]; last7: DayCount[] } | null;
  queue: { waiting: number; inConsultation: number; completed: number; skipped: number } | null;
  clinical: { opened: number; finished: number; openNow: number } | null;
  billing: { invoicesToday: StatusCount[]; collectedToday: string; byMethod: MethodAmount[]; last7: DayAmount[]; outstanding: string } | null;
};

const STATUS_ORDER = ["booked", "checked_in", "in_consultation", "completed", "cancelled", "no_show"];
const INVOICE_ORDER = ["draft", "issued", "partially_paid", "paid", "cancelled"];

/** A section is only there when the user also holds the permission of its data. */
function section(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function counts(value: unknown, order: string[]): StatusCount[] {
  const o = rec(value);
  const keys = [...order.filter((key) => key in o), ...Object.keys(o).filter((key) => !order.includes(key))];
  return keys.map((status) => ({ status, count: num(o[status]) ?? 0 }));
}

/** Money is text with two decimals. A number is shown with two decimals but never calculated with. */
function money(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value.toFixed(2);
  return "";
}

export function parseDashboard(body: unknown): Dashboard {
  const d = rec(rec(body).data);
  const patients = section(d.patients);
  const appointments = section(d.appointments);
  const queue = section(d.queue);
  const clinical = section(d.clinical);
  const billing = section(d.billing);

  return {
    date: str(d.date),
    timezone: str(d.timezone),
    currency: str(d.currency),
    patients: patients ? { registeredToday: num(patients.registered_today) ?? 0 } : null,
    appointments: appointments
      ? {
          total: num(appointments.today_total) ?? 0,
          byStatus: counts(appointments.by_status, STATUS_ORDER),
          byPractitioner: list(appointments.by_practitioner).map((raw) => ({
            name: nameOf(rec(raw).practitioner),
            count: num(rec(raw).count) ?? 0,
          })),
          last7: list(appointments.last_7_days).map((raw) => ({ date: str(rec(raw).date), count: num(rec(raw).count) ?? 0 })),
        }
      : null,
    queue: queue
      ? {
          waiting: num(queue.waiting) ?? 0,
          inConsultation: num(queue.in_consultation) ?? 0,
          completed: num(queue.completed) ?? 0,
          skipped: num(queue.skipped) ?? 0,
        }
      : null,
    clinical: clinical
      ? {
          opened: num(clinical.encounters_opened_today) ?? 0,
          finished: num(clinical.encounters_finished_today) ?? 0,
          openNow: num(clinical.open_now) ?? 0,
        }
      : null,
    billing: billing
      ? {
          invoicesToday: counts(billing.invoices_today, INVOICE_ORDER),
          collectedToday: money(billing.collected_today),
          byMethod: Object.entries(rec(billing.collected_by_method_today)).map(([method, raw]) => {
            const o = typeof raw === "object" && raw !== null ? rec(raw) : null;
            return { method, amount: o ? money(o.amount ?? o.total) : money(raw), share: o ? (num(o.share) ?? num(o.percent)) : null };
          }),
          last7: list(billing.collected_last_7_days).map((raw) => ({ date: str(rec(raw).date), amount: money(rec(raw).amount) })),
          outstanding: money(billing.outstanding_total),
        }
      : null,
  };
}
