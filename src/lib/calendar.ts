export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export type YMD = { y: number; m: number; d: number };

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function isValid(y: number, m: number, d: number): boolean {
  if (y < 1000 || m < 1 || m > 12 || d < 1) return false;
  return d <= daysInMonth(y, m);
}

export function toIso({ y, m, d }: YMD): string {
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}

/** "2026-10-18" -> parts, or null when it is not a real calendar date. */
export function parseIso(iso: string): YMD | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  return isValid(y, m, d) ? { y, m, d } : null;
}

export function formatDisplay(iso: string): string {
  const p = parseIso(iso);
  return p ? `${pad(p.d)}/${pad(p.m)}/${pad(p.y, 4)}` : "";
}

/** "18/10/2026" -> "2026-10-18", or null. */
export function parseDisplay(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return null;
  const ymd = { y: Number(match[3]), m: Number(match[2]), d: Number(match[1]) };
  return isValid(ymd.y, ymd.m, ymd.d) ? toIso(ymd) : null;
}

/** Keeps digits only and inserts the slashes while the user types. */
export function maskInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function addDays(iso: string, days: number): string {
  const p = parseIso(iso);
  if (!p) return iso;
  const t = new Date(Date.UTC(p.y, p.m - 1, p.d + days));
  return toIso({ y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() });
}

/** Moves by whole months and keeps the day inside the target month (31 Jan + 1 month = 28 Feb). */
export function addMonths(iso: string, months: number): string {
  const p = parseIso(iso);
  if (!p) return iso;
  const index = p.y * 12 + (p.m - 1) + months;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return toIso({ y, m, d: Math.min(p.d, daysInMonth(y, m)) });
}

/** Weeks of a month, Monday first. null = empty cell. */
export function monthWeeks(y: number, m: number): (string | null)[][] {
  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth(y, m); d++) cells.push(toIso({ y, m, d }));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Today by the browser's clock. Only used to block future days, never to show times. */
export function localTodayIso(now: Date = new Date()): string {
  return toIso({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });
}

export function weekdayName(iso: string): string {
  const p = parseIso(iso);
  return p ? WEEKDAY_NAMES[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()] : "";
}

/** Whole days from one date to another (negative when the second is earlier). null = not real dates. */
export function daysBetween(startIso: string, endIso: string): number | null {
  const a = parseIso(startIso);
  const b = parseIso(endIso);
  if (!a || !b) return null;
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
}