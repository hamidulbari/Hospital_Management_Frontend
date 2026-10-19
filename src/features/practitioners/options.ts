import type { Option } from "@/components/ui/select-field";
import type { BadgeTone } from "@/components/ui/status-badge";

export const PRACTITIONER_TYPE_OPTIONS: Option[] = [
  { value: "doctor", label: "Doctor" },
  { value: "nurse", label: "Nurse" },
  { value: "technician", label: "Technician" },
  { value: "therapist", label: "Therapist" },
  { value: "pharmacist", label: "Pharmacist" },
  { value: "other", label: "Other" },
];

export const PRACTITIONER_STATUS_OPTIONS: Option[] = [
  { value: "active", label: "Active" },
  { value: "on_leave", label: "On leave" },
  { value: "suspended", label: "Suspended" },
  { value: "left", label: "Left" },
];

export const CREDENTIAL_TYPE_OPTIONS: Option[] = [
  { value: "medical_council_registration", label: "Medical council registration" },
  { value: "nursing_council_registration", label: "Nursing council registration" },
  { value: "pharmacy_registration", label: "Pharmacy registration" },
  { value: "other", label: "Other" },
];

/** 1 = Monday ... 7 = Sunday, as the API wants it. */
export const WEEKDAY_OPTIONS: Option[] = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
  { value: "7", label: "Sunday" },
];

export const EXCEPTION_KIND_OPTIONS: Option[] = [
  { value: "blocked", label: "Not available (leave or holiday)" },
  { value: "extra", label: "Extra hours" },
];

export function weekdayLabel(weekday: number): string {
  return WEEKDAY_OPTIONS.find((o) => o.value === String(weekday))?.label ?? `Day ${weekday}`;
}

export function practitionerTone(status: string): BadgeTone {
  switch (status) {
    case "active":
    case "verified":
      return "active";
    case "on_leave":
      return "info";
    case "suspended":
    case "rejected":
    case "left":
      return status === "left" ? "muted" : "bad";
    default:
      return "neutral"; // pending
  }
}