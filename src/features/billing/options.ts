import type { Option } from "@/components/ui/select-field";
import type { BadgeTone } from "@/components/ui/status-badge";

export const INVOICE_STATUS_OPTIONS: Option[] = [
  { value: "draft", label: "Draft" },
  { value: "issued", label: "Issued" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
];

export const SERVICE_CATEGORY_OPTIONS: Option[] = [
  { value: "consultation", label: "Consultation" },
  { value: "procedure", label: "Procedure" },
  { value: "investigation", label: "Investigation" },
  { value: "bed", label: "Bed" },
  { value: "other", label: "Other" },
];

export const PAYMENT_METHOD_OPTIONS: Option[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

/** From the API: these methods need a reference. */
export const METHODS_NEEDING_REFERENCE = ["card", "upi", "bank_transfer", "cheque"];

export const ACTIVE_OPTIONS: Option[] = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

export function invoiceTone(status: string): BadgeTone {
  switch (status) {
    case "draft":
      return "neutral";
    case "issued":
      return "strong";
    case "partially_paid":
      return "info";
    case "paid":
    case "posted":
      return "active";
    case "cancelled":
    case "reversed":
      return "bad";
    default:
      return "neutral";
  }
}