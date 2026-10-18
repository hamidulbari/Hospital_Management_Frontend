import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireSession } from "@/lib/auth/session";

export default async function DashboardPage() {
  const session = await requireSession();

  return (
    <>
      <PageHeader title="Dashboard" description={`Signed in as ${session.name}`} />
      <EmptyState
        title="Nothing here yet"
        description="Quick actions and today's lists will appear here once the patient and appointment screens exist."
      />
    </>
  );
}