import Link from "next/link";
import { can, type PermissionCode } from "@/lib/permissions";

type Action = { label: string; description: string; href: string; permission: PermissionCode; ready: boolean };

const ACTIONS: Action[] = [
  { label: "Search patient", description: "By name, phone or MRN", href: "/patients", permission: "patient.view", ready: true },
  { label: "Register patient", description: "New patient record", href: "/patients/new", permission: "patient.register", ready: true },
  { label: "Book appointment", description: "Doctor, date and slot", href: "/appointments/new", permission: "appointment.book", ready: true },
  { label: "Walk-in", description: "Patient without a booking", href: "/appointments/walk-in", permission: "appointment.book", ready: true },
  { label: "Today's appointments", description: "Check in, cancel, reschedule", href: "/appointments", permission: "appointment.view", ready: true },
  { label: "OPD queue", description: "Tokens and who is waiting", href: "/appointments/queue", permission: "appointment.view", ready: true },
  { label: "New invoice", description: "Bill a patient", href: "/billing/new", permission: "billing.invoice.create", ready: true },
];

export function QuickActions({ permissions }: { permissions: readonly string[] }) {
  const allowed = ACTIONS.filter((action) => can(permissions, action.permission));
  if (allowed.length === 0) return null;

  return (
    <section aria-label="Quick actions">
      <h2 className="mb-3 font-headline text-xs font-semibold uppercase tracking-wider text-muted">Quick actions</h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {allowed.map((action) => (
          <li key={action.href}>
            {action.ready ? (
              <Link
                href={action.href}
                prefetch={false}
                className="flex h-full items-start justify-between gap-3 border border-ink bg-surface p-4 hover:border-primary hover:bg-accent"
              >
                <span>
                  <span className="block text-sm font-semibold text-ink">{action.label}</span>
                  <span className="mt-1 block text-xs text-muted">{action.description}</span>
                </span>
                <span aria-hidden="true" className="font-headline text-lg text-ink">→</span>
              </Link>
            ) : (
              <div aria-disabled="true" className="flex h-full items-start justify-between gap-3 border border-accent bg-surface p-4">
                <span>
                  <span className="block text-sm font-semibold text-muted">{action.label}</span>
                  <span className="mt-1 block text-xs text-muted">{action.description}</span>
                </span>
                <span className="font-headline text-[10px] font-semibold uppercase tracking-wider text-muted">Soon</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}