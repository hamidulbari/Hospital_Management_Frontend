import type { PermissionCode } from "@/lib/permissions";

export type NavConfig = {
  label: string;
  href: string;
  ready: boolean; // false = screen not built yet, shown as "Soon"
  anyOf: readonly PermissionCode[]; // empty = everyone signed in
};

export const NAV_ITEMS: readonly NavConfig[] = [
  { label: "Dashboard", href: "/", ready: true, anyOf: [] },
  { label: "Patients", href: "/patients", ready: false, anyOf: ["patient.view"] },
  { label: "Appointments", href: "/appointments", ready: false, anyOf: ["appointment.view"] },
  { label: "Billing", href: "/billing", ready: false, anyOf: ["billing.invoice.view", "billing.service.view", "billing.statement.view"] },
  {
    label: "Administration",
    href: "/admin",
    ready: false,
    anyOf: [
      "identity.user.view",
      "identity.role.view",
      "audit.event.view",
      "organization.hospital.view",
      "organization.branch.view",
      "organization.department.view",
    ],
  },
];