import type { InvoiceLine } from "./parse";

/** id -> code and category, from the price list. */
export type ServiceIndex = Record<string, { code: string; category: string }>;
export type BillLine = InvoiceLine & { code: string };
export type BillGroup = { key: string; label: string; lines: BillLine[] };

const ORDER = ["consultation", "procedure", "investigation", "bed", "other"];
const LABELS: Record<string, string> = {
  consultation: "Consultation charges",
  procedure: "Procedure charges",
  investigation: "Investigation charges",
  bed: "Room/Bed charges",
  other: "Other charges",
};

/**
 * Puts the lines under a heading per category. Only headings: no amount is added up here.
 * The category and code come from the line, else from the price list; a line with neither goes under "Other charges".
 */
export function groupLines(lines: InvoiceLine[], index: ServiceIndex): BillGroup[] {
  const groups = new Map<string, BillLine[]>();
  for (const line of lines) {
    const known = index[line.serviceId];
    const knownCategory = known?.category ?? "";
    const category = ORDER.includes(line.category) ? line.category : ORDER.includes(knownCategory) ? knownCategory : "other";
    const code = line.code || known?.code || "";
    groups.set(category, [...(groups.get(category) ?? []), { ...line, code }]);
  }
  return ORDER.filter((key) => groups.has(key)).map((key) => ({ key, label: LABELS[key], lines: groups.get(key) ?? [] }));
}