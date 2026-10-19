import type { Option } from "@/components/ui/select-field";

/** The timezones this browser knows (IANA names, for example Asia/Kolkata). The current one is always in the list. */
export function timezoneOptions(current: string): Option[] {
  let zones: string[] = [];
  try {
    const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
    zones = supported ? supported("timeZone") : [];
  } catch {
    zones = [];
  }
  if (zones.length === 0) zones = ["UTC", "Asia/Kolkata", "Asia/Qatar", "Asia/Dubai"];
  if (current && !zones.includes(current)) zones = [current, ...zones];
  return zones.map((zone) => ({ value: zone, label: zone }));
}

export function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}