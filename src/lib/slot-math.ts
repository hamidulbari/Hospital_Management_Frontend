import { isValidTime } from "./time-input";

/** "09:30" -> 570 (minutes since midnight). null when it is not a real 24-hour time. */
export function toMinutes(time: string): number | null {
  if (!isValidTime(time)) return null;
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}

/** Minutes from start to end on the same day. null when a time is missing or the end is not after the start. */
export function windowMinutes(start: string, end: string): number | null {
  const a = toMinutes(start);
  const b = toMinutes(end);
  return a !== null && b !== null && b > a ? b - a : null;
}

/** How many whole slots fit in the window. */
export function slotsIn(window: number, slotMinutes: number): number {
  return slotMinutes >= 1 ? Math.floor(window / slotMinutes) : 0;
}

/** The slot length (whole minutes) that gives this many appointments in the window. */
export function slotLengthFor(window: number, count: number): number {
  return count >= 1 ? Math.floor(window / count) : 0;
}

/** 100 -> "1 h 40 min", 60 -> "1 h", 45 -> "45 min". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** Appointment counts that fill the window exactly (no minutes left over) with slots of minSlot to maxSlot minutes. */
export function exactCounts(window: number, minSlot = 5, maxSlot = 240): number[] {
  const counts: number[] = [];
  for (let count = 1; count <= window; count++) {
    if (window % count !== 0) continue;
    const slot = window / count;
    if (slot >= minSlot && slot <= maxSlot) counts.push(count);
  }
  return counts;
}

/** The few values of a list that are closest to a target, in ascending order. */
export function nearest(values: number[], target: number, take = 5): number[] {
  return [...values]
    .sort((a, b) => Math.abs(a - target) - Math.abs(b - target) || a - b)
    .slice(0, take)
    .sort((a, b) => a - b);
}