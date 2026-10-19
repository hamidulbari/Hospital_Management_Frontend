import type { PermissionCode } from "@/lib/permissions";

export type NavConfig = {
  label: string;
  href: string;
  ready: boolean; // false = screen not built yet, shown as "Soon"
  anyOf: readonly PermissionCode[]; // empty = everyone signed in
};

export const NAV_ITEMS: readonly NavConfig[] = [
  { label: "Dashboard", href: "/", ready: true, anyOf: [] },
  { label: "Patients", href: "/patients", ready: true, anyOf: ["patient.view"] },
  { label: "Appointments", href: "/appointments", ready: true, anyOf: ["appointment.view"] },
  { label: "Consultation", href: "/consultation", ready: true, anyOf: ["clinical.encounter.view"] },
  { label: "Billing", href: "/billing", ready: true, anyOf: ["billing.invoice.view", "billing.service.view", "billing.statement.view"] },
  {
    label: "Administration",
    href: "/admin",
    ready: true,
    // "manage" on purpose: a nurse or receptionist can view practitioners, but does not need this menu.
    anyOf: [
      "practitioner.manage",
      "identity.user.view",
      "identity.role.view",
      "audit.event.view",
      "organization.hospital.view",
      "organization.branch.view",
      "organization.department.view",
    ],
  },
];