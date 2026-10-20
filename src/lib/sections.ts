export type SectionKey = "dashboard" | "patients" | "appointments" | "consultation" | "billing" | "admin" | "settings";

const BY_FIRST_SEGMENT: Record<string, SectionKey> = {
  patients: "patients",
  appointments: "appointments",
  consultation: "consultation",
  billing: "billing",
  admin: "admin",
  settings: "settings",
};

/** The part of the app a path belongs to. It decides the colour. Anything unknown is the dashboard. */
export function sectionFor(pathname: string): SectionKey {
  const first = pathname.split("/").filter(Boolean)[0] ?? "";
  return BY_FIRST_SEGMENT[first] ?? "dashboard";
}
