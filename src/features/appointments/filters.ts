import { parseIso } from "@/lib/calendar";

const ID_RE = /^[0-9a-z]{26}$/i;

export type DayFilters = { date: string; practitioner: string; status: string; page: number };

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/** Reads ?date=&practitioner=&status=&page= safely. Anything invalid falls back to a default. */
export function readDayFilters(
  raw: Record<string, string | string[] | undefined>,
  today: string,
  allowedStatuses: readonly string[],
): DayFilters {
  const date = first(raw.date);
  const practitioner = first(raw.practitioner);
  const status = first(raw.status);
  const page = Number(first(raw.page));

  return {
    date: parseIso(date) ? date : today,
    practitioner: ID_RE.test(practitioner) ? practitioner : "",
    status: allowedStatuses.includes(status) ? status : "",
    page: Number.isInteger(page) && page >= 1 && page <= 10_000 ? page : 1,
  };
}