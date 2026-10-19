export type Crumb = { label: string; href: string };

// One line per page. A page that is not listed gets its URL segment, made readable.
const LABELS: Record<string, string> = {
  "/patients": "Patients",
  "/patients/new": "Register patient",
  "/appointments": "Appointments",
  "/appointments/queue": "OPD queue",
  "/appointments/new": "Book appointment",
  "/appointments/walk-in": "Walk-in",
  "/consultation": "Consultation",
  "/billing": "Billing",
  "/admin": "Administration",
};

// A 26-character id in the URL: named by what lives under the parent, never by a patient's name.
const ID_RE = /^[0-9a-z]{26}$/i;
const ID_LABELS: Record<string, string> = {
  "/patients": "Patient record",
  "/appointments": "Appointment",
  "/consultation": "Encounter",
};

function readable(segment: string): string {
  const text = segment.replace(/[-_]+/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : segment;
}

/** "/appointments/queue" -> Dashboard, Appointments, OPD queue. The dashboard itself has no breadcrumb. */
export function crumbsFor(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [];

  const crumbs: Crumb[] = [{ label: "Dashboard", href: "/" }];
  let path = "";
  for (const segment of segments) {
    const parent = path;
    path += `/${segment}`;
    const label = LABELS[path] ?? (ID_RE.test(segment) ? (ID_LABELS[parent] ?? "Details") : readable(segment));
    crumbs.push({ label, href: path });
  }
  return crumbs;
}