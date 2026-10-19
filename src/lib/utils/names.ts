import { rec, str } from "./guards";

export function nameOf(value: unknown): string {
  const o = rec(value);
  const full = str(o.full_name) || str(o.name) || str(o.display_name);
  if (full) return full;
  return [o.title, o.first_name, o.middle_name, o.last_name].map(str).filter(Boolean).join(" ");
}