import { NoAccess } from "@/components/ui/no-access";
import { PageHeader } from "@/components/ui/page-header";
import { BookingForm } from "@/features/appointments/booking-form";
import { toPractitionerOptions } from "@/features/appointments/options";
import { loadPractitioners } from "@/features/appointments/server";
import { requireSession } from "@/lib/auth/session";
import { hospitalNow } from "@/lib/hospital";
import { can } from "@/lib/permissions";

export default async function WalkInPage() {
  const session = await requireSession();
  if (!can(session.permissions, "appointment.book") || !can(session.permissions, "appointment.view")) return <NoAccess />;

  const [now, practitioners] = await Promise.all([hospitalNow(), loadPractitioners()]);

  return (
    <>
      <PageHeader title="Walk-in" description="Register a patient who has arrived without a booking. Today's slots only." />
      <BookingForm mode="walk_in" practitioners={toPractitionerOptions(practitioners.list)} today={now.today} timezone={now.timezone} />
    </>
  );
}