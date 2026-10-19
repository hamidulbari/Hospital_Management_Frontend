import type { Option } from "@/components/ui/select-field";
import type { BadgeTone } from "@/components/ui/status-badge";

export const DATE_FORMAT_OPTIONS: Option[] = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
];

export const ACTIVE_STATUS_OPTIONS: Option[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export const DEPARTMENT_TYPE_OPTIONS: Option[] = [
  { value: "clinical", label: "Clinical" },
  { value: "diagnostic", label: "Diagnostic" },
  { value: "support", label: "Support" },
  { value: "administrative", label: "Administrative" },
];

export function activeTone(status: string): BadgeTone {
  if (status === "active") return "active";
  if (status === "inactive") return "muted";
  return "neutral";
}