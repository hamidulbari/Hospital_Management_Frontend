import { localParts } from "@/lib/datetime";
import { parsePage, type PageInfo } from "@/lib/api/meta";
import { list, rec, str, strOrNull } from "@/lib/utils/guards";

export type AppointmentItem = {
  id: string;
  date: string;
  time: string;
  status: string;
  type: string;
  source: string;
  reason: string | null;
  patientName: string;
  patientMrn: string;
  practitionerId: string;
  practitionerName: string;
  token: string | null;
};

export type QueueItem = {
  id: string;
  token: string | null;
  status: string;
  patientName: string;
  patientMrn: string;
  practitionerName: string;
};

export type PractitionerOption = { id: string; name: string; specialization: string };
export type SlotDay = { date: string; times: string[] };

function nameOf(value: unknown): string {
  const o = rec(value);
  const full = str(o.full_name) || str(o.name) || str(o.display_name);
  if (full) return full;
  return [o.title, o.first_name, o.middle_name, o.last_name].map(str).filter(Boolean).join(" ");
}

/** Finds an OPD token number in an answer, whatever it is called. null when none is there. */
export function tokenOf(value: unknown): string | null {
  const o = rec(value);
  for (const key of ["token_number", "token", "opd_token", "queue_token", "queue_number", "number"]) {
    const found = o[key];
    if (typeof found === "number" && Number.isFinite(found)) return String(found);
    if (typeof found === "string" && found) return found;
    if (typeof found === "object" && found !== null) {
      const inner = tokenOf(found);
      if (inner) return inner;
    }
  }
  return null;
}

export function parseAppointment(raw: unknown, timezone: string | null): AppointmentItem {
  const a = rec(raw);
  const patient = rec(a.patient);
  const practitioner = rec(a.practitioner);

  let date = str(a.date);
  let time = str(a.time) || str(a.start_time);
  const instant = str(a.starts_at);
  if ((!date || !time) && timezone && instant) {
    const parts = localParts(new Date(instant), timezone);
    if (parts) {
      date = date || parts.date;
      time = time || parts.time;
    }
  }

  return {
    id: str(a.id),
    date,
    time: time.slice(0, 5),
    status: str(a.status),
    type: str(a.appointment_type) || str(a.type),
    source: str(a.source),
    reason: strOrNull(a.reason),
    patientName: nameOf(patient) || str(a.patient_name),
    patientMrn: str(patient.mrn) || str(a.patient_mrn) || str(a.mrn),
    practitionerId: str(a.practitioner_id) || str(practitioner.id),
    practitionerName: nameOf(practitioner) || str(a.practitioner_name),
    token: tokenOf(a),
  };
}

export function parseAppointmentList(body: unknown, timezone: string | null): { items: AppointmentItem[] } & PageInfo {
  const items = list(rec(body).data).map((item) => parseAppointment(item, timezone));
  return { items, ...parsePage(body, items.length) };
}

export function parseQueue(body: unknown): QueueItem[] {
  return list(rec(body).data).map((raw) => {
    const q = rec(raw);
    const appointment = rec(q.appointment);
    const patient = rec(q.patient ?? appointment.patient);
    const practitioner = rec(q.practitioner ?? appointment.practitioner);
    return {
      id: str(q.id),
      token: tokenOf(q),
      status: str(q.status),
      patientName: nameOf(patient) || str(q.patient_name),
      patientMrn: str(patient.mrn) || str(q.patient_mrn),
      practitionerName: nameOf(practitioner) || str(q.practitioner_name),
    };
  });
}

export function parsePractitioners(body: unknown): PractitionerOption[] {
  return list(rec(body).data)
    .map((raw) => {
      const p = rec(raw);
      const specializations = list(p.specializations).map((s) => str(rec(s).name) || str(s)).filter(Boolean);
      return { id: str(p.id), name: nameOf(p), specialization: specializations[0] ?? "" };
    })
    .filter((p) => p.id && p.name);
}

const TIME_RE = /^(\d{2}):(\d{2})/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T/;

function slotOf(value: unknown, fallbackDate: string, timezone: string | null): { date: string; time: string } | null {
  const o = rec(value);
  const text = typeof value === "string" ? value : str(o.time) || str(o.start_time) || str(o.start) || str(o.starts_at);
  const date = str(o.date) || fallbackDate;

  if (ISO_RE.test(text)) {
    const parts = timezone ? localParts(new Date(text), timezone) : null;
    if (parts) return parts;
    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(text);
    return m ? { date: m[1], time: `${m[2]}:${m[3]}` } : null;
  }
  const m = TIME_RE.exec(text);
  return m && date ? { date, time: `${m[1]}:${m[2]}` } : null;
}

/** Accepts a flat list of slots, a list of { date, slots: [...] }, or an object keyed by date. Returns days with sorted times. */
export function parseSlots(body: unknown, timezone: string | null): SlotDay[] {
  const data = rec(body).data;
  const found: { date: string; time: string }[] = [];
  const add = (value: unknown, date: string) => {
    const slot = slotOf(value, date, timezone);
    if (slot) found.push(slot);
  };

  if (Array.isArray(data)) {
    for (const item of data) {
      const o = rec(item);
      const nested = Array.isArray(o.slots) ? o.slots : Array.isArray(o.times) ? o.times : null;
      if (nested) nested.forEach((slot) => add(slot, str(o.date)));
      else add(item, "");
    }
  } else if (typeof data === "object" && data !== null) {
    for (const [key, value] of Object.entries(data)) {
      const nested = Array.isArray(value) ? value : list(rec(value).slots);
      nested.forEach((slot) => add(slot, key));
    }
  }

  const byDate = new Map<string, Set<string>>();
  for (const { date, time } of found) byDate.set(date, (byDate.get(date) ?? new Set()).add(time));
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, times]) => ({ date, times: [...times].sort() }));
}