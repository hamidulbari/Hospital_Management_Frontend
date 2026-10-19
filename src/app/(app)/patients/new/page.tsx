import { NoAccess } from "@/components/ui/no-access";
import { PageHeader } from "@/components/ui/page-header";
import { RegisterForm } from "@/features/patients/register-form";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";

export default async function NewPatientPage() {
  const session = await requireSession();
  if (!can(session.permissions, "patient.register")) return <NoAccess />;

  return (
    <>
      <PageHeader title="Register patient" description="Fields marked * are required." />
      <RegisterForm />
    </>
  );
}