import { LinkButton } from "@/components/ui/link-button";
import { NoAccess } from "@/components/ui/no-access";
import { PageHeader } from "@/components/ui/page-header";
import { PatientSearch } from "@/features/patients/patient-search";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";

export default async function PatientsPage() {
  const session = await requireSession();
  if (!can(session.permissions, "patient.view")) return <NoAccess />;

  return (
    <>
      <PageHeader
        title="Patients"
        description="Search by name, phone number or MRN."
        actions={can(session.permissions, "patient.register") ? <LinkButton href="/patients/new">Register patient</LinkButton> : undefined}
      />
      <PatientSearch />
    </>
  );
}