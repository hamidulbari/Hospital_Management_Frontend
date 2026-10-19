import { daysInMonth, parseIso, toIso } from "./calendar";

export type AgeParts = { years: number; months: number; days: number };

/** Whole years, months and days between a date of birth and today (both "YYYY-MM-DD"). null = not a real past date. */
export function ageParts(dobIso: string, todayIso: string): AgeParts | null {
  const dob = parseIso(dobIso);
  const today = parseIso(todayIso);
  if (!dob || !today || toIso(dob) > toIso(today)) return null;

  let years = today.y - dob.y;
  let months = today.m - dob.m;
  let days = today.d - dob.d;

  if (days < 0) {
    months -= 1;
    const prevMonth = today.m === 1 ? 12 : today.m - 1;
    const prevYear = today.m === 1 ? today.y - 1 : today.y;
    days += daysInMonth(prevYear, prevMonth);
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days: Math.max(0, days) };
}

/** "12 years", "8 months" or "9 days". Empty text when the date is not usable. */
export function formatAge(dobIso: string, todayIso: string): string {
  const age = ageParts(dobIso, todayIso);
  if (!age) return "";
  if (age.years >= 1) return `${age.years} ${age.years === 1 ? "year" : "years"}`;
  if (age.months >= 1) return `${age.months} ${age.months === 1 ? "month" : "months"}`;
  return `${age.days} ${age.days === 1 ? "day" : "days"}`;
}