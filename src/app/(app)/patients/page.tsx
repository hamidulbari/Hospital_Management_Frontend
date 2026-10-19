import { LinkButton } from "@/components/ui/link-button";
import { NoAccess } from "@/components/ui/no-access";
import { PageHeader } from "@/components/ui/page-header";
import { parsePatientList } from "@/features/patients/parse";
import { PatientSearch } from "@/features/patients/patient-search";
import { apiLoad } from "@/lib/api/load";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";

export default async function PatientsPage() {
  const session = await requireSession();
  if (!can(session.permissions, "patient.view")) return <NoAccess />;

  // The newest 50 registrations: needs only patient.view. It is audited (patient.recent_listed), so it is loaded once per visit.
  const recent = await apiLoad<unknown>("/patients", { query: { recent: true } });
  const initial = recent.ok ? parsePatientList(recent.data) : null;

  return (
    <>
      <PageHeader
        title="Patients"
        description="The newest registrations are listed below. Search by name, phone number or MRN to find anyone else."
        actions={can(session.permissions, "patient.register") ? <LinkButton href="/patients/new">Register patient</LinkButton> : undefined}
      />
      <PatientSearch initial={initial} />
    </>
  );
}
