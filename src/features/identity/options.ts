import type { Option } from "@/components/ui/select-field";
import type { BadgeTone } from "@/components/ui/status-badge";

export const USER_STATUS_OPTIONS: Option[] = [
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled" },
];

export function userTone(status: string): BadgeTone {
  if (status === "active") return "active";
  if (status === "disabled") return "bad";
  return "neutral";
}