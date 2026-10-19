import { TabsNav } from "@/components/ui/tabs-nav";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";

export default async function BillingLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const p = session.permissions;

  const items = [
    can(p, "billing.invoice.view") ? { label: "Invoices", href: "/billing" } : null,
    can(p, "billing.invoice.create") ? { label: "New invoice", href: "/billing/new" } : null,
    can(p, "billing.service.view") ? { label: "Price list", href: "/billing/services" } : null,
    can(p, "billing.statement.view") ? { label: "Patient statement", href: "/billing/statement" } : null,
  ].filter((item): item is { label: string; href: string } => item !== null);

  return (
    <>
      <TabsNav items={items} label="Billing" />
      {children}
    </>
  );
}