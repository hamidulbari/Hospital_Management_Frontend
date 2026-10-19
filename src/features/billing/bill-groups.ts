import type { GroupTotal, InvoiceLine } from "./parse";

export const CATEGORY_ORDER = ["consultation", "procedure", "investigation", "bed", "other"] as const;

const LABELS: Record<string, string> = {
  consultation: "Consultation charges",
  procedure: "Procedure charges",
  investigation: "Investigation charges",
  bed: "Room/Bed charges",
  other: "Other charges",
};

export type BillGroup = { key: string; label: string; lines: InvoiceLine[]; /** The server's sum for this category ("" when it did not send one). */ subtotal: string };

/**
 * Puts the lines under a heading per category, in a fixed order. The category comes from the server
 * ("other" for a line that is not in the price list). The subtotal is the server's own number: nothing is added up here.
 */
export function groupLines(lines: InvoiceLine[], totals: readonly GroupTotal[]): BillGroup[] {
  const groups = new Map<string, InvoiceLine[]>();
  for (const line of lines) {
    const key = (CATEGORY_ORDER as readonly string[]).includes(line.category) ? line.category : "other";
    groups.set(key, [...(groups.get(key) ?? []), line]);
  }
  return CATEGORY_ORDER.filter((key) => groups.has(key)).map((key) => ({
    key,
    label: LABELS[key],
    lines: groups.get(key) ?? [],
    subtotal: totals.find((t) => t.category === key)?.amount ?? "",
  }));
}
