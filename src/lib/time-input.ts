export type Meridiem = "AM" | "PM";

/** Keeps digits only and puts the colon in while the person types: "0930" -> "09:30". */
export function maskTime(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function isValidTime(text: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(text);
}

/** "09:00:00" -> "09:00". Anything else is returned as it is. */
export function shortTime(value: string): string {
  const match = /^(\d{2}):(\d{2})/.exec(value);
  return match ? `${match[1]}:${match[2]}` : value;
}

/** "14:30" -> { hour: 2, minute: 30, meridiem: "PM" }. null when it is not a real 24-hour time. */
export function to12h(value: string): { hour: number; minute: number; meridiem: Meridiem } | null {
  if (!isValidTime(value)) return null;
  const hours = Number(value.slice(0, 2));
  return { hour: hours % 12 === 0 ? 12 : hours % 12, minute: Number(value.slice(3, 5)), meridiem: hours >= 12 ? "PM" : "AM" };
}

/** (2, 30, "PM") -> "14:30". 12 AM is 00:xx and 12 PM is 12:xx. */
export function from12h(hour: number, minute: number, meridiem: Meridiem): string {
  const hours = (hour % 12) + (meridiem === "PM" ? 12 : 0);
  return `${String(hours).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** "14:30" -> "02:30 PM". Empty when the value is empty or not a time. */
export function format12h(value: string): string {
  const parts = to12h(value);
  if (!parts) return "";
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")} ${parts.meridiem}`;
}