import { formatInstant } from "./datetime";

/** A server timestamp in the hospital's timezone. Without a timezone it shows the server's own text, never the browser's time. */
export function showInstant(iso: string | null, timezone: string | null): string {
  if (!iso) return "";
  if (timezone) return formatInstant(iso, timezone);
  return iso.slice(0, 16).replace("T", " ");
}