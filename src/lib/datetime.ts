const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})(?::\d{2})?$/;

/** Hospital-local date "2026-10-18" -> "18 Oct 2026". Pure text: no Date object, no browser timezone. */
export function formatLocalDate(date: string): string {
  const m = DATE_RE.exec(date);
  if (!m) return date;
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month} ${m[1]}` : date;
}

/** Hospital-local time "09:30" or "09:30:00" -> "09:30". */
export function formatLocalTime(time: string): string {
  const m = TIME_RE.exec(time);
  return m ? `${m[1]}:${m[2]}` : time;
}

/** A UTC instant (starts_at) shown in the HOSPITAL's timezone (never the browser's). */
export function formatInstant(iso: string, timeZone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
  } catch {
    return iso;
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const month = MONTHS[Number(get("month")) - 1] ?? get("month");
  return `${Number(get("day"))} ${month} ${get("year")}, ${get("hour")}:${get("minute")}`;
}

/** Today's date ("YYYY-MM-DD") in the hospital's timezone. */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Date ("YYYY-MM-DD") and time ("HH:mm") of an instant in the given timezone. null when the timezone is not valid. */
export function localParts(instant: Date, timeZone: string): { date: string; time: string } | null {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(instant);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
  } catch {
    return null;
  }
}