import { NoAccess } from "@/components/ui/no-access";
import { PageHeader } from "@/components/ui/page-header";
import { StatementPicker } from "@/features/billing/statement-picker";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";

export default async function StatementIndexPage() {
  const session = await requireSession();
  if (!can(session.permissions, "billing.statement.view")) return <NoAccess />;

  return (
    <>
      <PageHeader title="Patient statement" description="Search for a patient to see what they owe." />
      <StatementPicker />
    </>
  );
}