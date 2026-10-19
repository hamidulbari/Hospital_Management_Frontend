import { TabsNav } from "@/components/ui/tabs-nav";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";

export default async function AppointmentsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const view = can(session.permissions, "appointment.view");
  const book = can(session.permissions, "appointment.book");

  const items = [
    view ? { label: "Day list", href: "/appointments" } : null,
    view ? { label: "OPD queue", href: "/appointments/queue" } : null,
    book ? { label: "Book", href: "/appointments/new" } : null,
    book ? { label: "Walk-in", href: "/appointments/walk-in" } : null,
  ].filter((item): item is { label: string; href: string } => item !== null);

  return (
    <>
      <TabsNav items={items} label="Appointments" />
      {children}
    </>
  );
}