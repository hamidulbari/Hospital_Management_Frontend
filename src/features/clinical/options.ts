import type { Option } from "@/components/ui/select-field";
import type { BadgeTone } from "@/components/ui/status-badge";

export const ENCOUNTER_STATUS_OPTIONS: Option[] = [
  { value: "open", label: "Open" },
  { value: "finished", label: "Finished" },
];

export const ENCOUNTER_TYPE_OPTIONS: Option[] = [
  { value: "opd", label: "OPD" },
  { value: "ipd", label: "IPD" },
  { value: "emergency", label: "Emergency" },
  { value: "telemedicine", label: "Telemedicine" },
  { value: "home", label: "Home visit" },
];

export const NOTE_TYPE_OPTIONS: Option[] = [
  { value: "history", label: "History" },
  { value: "examination", label: "Examination" },
  { value: "progress", label: "Progress" },
  { value: "advice", label: "Advice" },
  { value: "other", label: "Other" },
];

export const DIAGNOSIS_TYPE_OPTIONS: Option[] = [
  { value: "provisional", label: "Provisional" },
  { value: "differential", label: "Differential" },
  { value: "final", label: "Final" },
];

export const CODE_SYSTEM_OPTIONS: Option[] = [
  { value: "free_text", label: "Free text (no code)" },
  { value: "icd10", label: "ICD-10" },
  { value: "snomed", label: "SNOMED" },
  { value: "local", label: "Local code" },
];

// The codes and units are fixed by the server. These are typing helpers, never clinical limits.
export const VITAL_CODES = [
  "temperature_c",
  "pulse_bpm",
  "respiratory_rate",
  "bp_systolic_mmhg",
  "bp_diastolic_mmhg",
  "spo2_percent",
  "weight_kg",
  "height_cm",
  "pain_score",
] as const;
export type VitalCode = (typeof VITAL_CODES)[number];

export const VITAL_FIELDS: { code: VitalCode; label: string; unit: string }[] = [
  { code: "temperature_c", label: "Temperature", unit: "°C" },
  { code: "pulse_bpm", label: "Pulse", unit: "beats/min" },
  { code: "respiratory_rate", label: "Respiratory rate", unit: "breaths/min" },
  { code: "bp_systolic_mmhg", label: "BP systolic", unit: "mmHg" },
  { code: "bp_diastolic_mmhg", label: "BP diastolic", unit: "mmHg" },
  { code: "spo2_percent", label: "SpO2", unit: "%" },
  { code: "weight_kg", label: "Weight", unit: "kg" },
  { code: "height_cm", label: "Height", unit: "cm" },
  { code: "pain_score", label: "Pain score", unit: "score 0-10" },
];

export function vitalLabel(code: string): string {
  return VITAL_FIELDS.find((f) => f.code === code)?.label ?? code.replace(/_/g, " ");
}

export function prettyUnit(unit: string): string {
  return unit === "degC" ? "°C" : unit;
}

/** Badge colours are about the record's status only, never about a clinical value. */
export function clinicalTone(status: string): BadgeTone {
  switch (status) {
    case "open":
    case "draft":
      return "active";
    case "signed":
      return "strong";
    case "finished":
    case "superseded":
      return "muted";
    case "entered_in_error":
      return "bad";
    default:
      return "neutral";
  }
}