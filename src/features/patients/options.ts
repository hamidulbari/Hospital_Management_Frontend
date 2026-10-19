import { humanize } from "@/lib/format";
import type { Option } from "@/components/ui/select-field";

export const TITLE_OPTIONS: Option[] = ["Mr", "Mrs", "Ms", "Miss", "Master", "Baby", "Dr", "Prof"].map((value) => ({
  value,
  label: value,
}));

export const SEX_OPTIONS: Option[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "unknown", label: "Unknown" },
];

export const BLOOD_GROUP_OPTIONS: Option[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"].map((value) => ({
  value,
  label: value === "unknown" ? "Unknown" : value,
}));

export const CONSENT_TYPE_OPTIONS: Option[] = [
  { value: "treatment", label: "Treatment" },
  { value: "data_sharing", label: "Data sharing" },
  { value: "abha_linking", label: "ABHA linking" },
  { value: "communication", label: "Communication" },
  { value: "research", label: "Research" },
  { value: "telemedicine", label: "Telemedicine" },
];

export const CONSENT_METHOD_OPTIONS: Option[] = [
  { value: "paper", label: "Paper" },
  { value: "digital", label: "Digital" },
  { value: "verbal_witnessed", label: "Verbal (witnessed)" },
];

export const GIVEN_BY_OPTIONS: Option[] = [
  { value: "patient", label: "Patient" },
  { value: "representative", label: "Representative" },
];

/** One unticked row per consent type for the registration form. Nothing is pre-ticked: consent must be explicit. */
export function defaultConsentDrafts() {
  return CONSENT_TYPE_OPTIONS.map((option) => ({ type: option.value, granted: false, method: "", given_by: "" }));
}

export function labelFor(options: readonly Option[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? humanize(value);
}