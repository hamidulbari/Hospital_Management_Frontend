import { parseIso } from "@/lib/calendar";
import { readPage } from "@/lib/page-param";

export type InvoiceFilters = { date: string; status: string; page: number };

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/** The day is optional: without it the newest invoices of any day are listed. The day means when it was CREATED. */
export function readInvoiceFilters(raw: Record<string, string | string[] | undefined>, allowedStatuses: readonly string[]): InvoiceFilters {
  const date = first(raw.date);
  const status = first(raw.status);
  return {
    date: parseIso(date) ? date : "",
    status: allowedStatuses.includes(status) ? status : "",
    page: readPage(raw.page),
  };
}
