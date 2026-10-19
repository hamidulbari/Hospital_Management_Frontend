import type { Option } from "@/components/ui/select-field";
import type { BadgeTone } from "@/components/ui/status-badge";
import type { PractitionerOption } from "./parse";

export const MAX_SLOT_DAYS = 14;
export const APPOINTMENTS_PAGE_SIZE = 20;

export const APPOINTMENT_TYPE_OPTIONS: Option[] = [
  { value: "consultation", label: "Consultation" },
  { value: "follow_up", label: "Follow-up" },
  { value: "procedure", label: "Procedure" },
];

export const APPOINTMENT_STATUS_OPTIONS: Option[] = [
  { value: "booked", label: "Booked" },
  { value: "checked_in", label: "Checked in" },
  { value: "in_consultation", label: "In consultation" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No-show" },
];

export const QUEUE_STATUS_OPTIONS: Option[] = [
  { value: "waiting", label: "Waiting" },
  { value: "in_consultation", label: "In consultation" },
  { value: "completed", label: "Completed" },
  { value: "skipped", label: "Skipped" },
];

export const SLOT_RANGE_OPTIONS: Option[] = [
  { value: "1", label: "1 day" },
  { value: "3", label: "3 days" },
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
];

const TONES: Record<string, BadgeTone> = {
  booked: "active",
  checked_in: "strong",
  in_consultation: "info",
  completed: "muted",
  cancelled: "bad",
  no_show: "bad",
  waiting: "active",
  skipped: "bad",
};

export function statusTone(status: string): BadgeTone {
  return TONES[status] ?? "neutral";
}

export function toPractitionerOptions(list: PractitionerOption[]): Option[] {
  return list.map((p) => ({ value: p.id, label: p.specialization ? `${p.name} — ${p.specialization}` : p.name }));
}