import { DetailList } from "@/components/ui/detail-list";
import { EmptyState } from "@/components/ui/empty-state";
import { NoAccess } from "@/components/ui/no-access";
import { ErrorNotice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { HospitalForm } from "@/features/organization/hospital-form";
import { parseHospital } from "@/features/organization/parse";
import { apiLoad } from "@/lib/api/load";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";

export default async function HospitalPage() {
  const session = await requireSession();
  const p = session.permissions;
  if (!can(p, "organization.hospital.view")) return <NoAccess />;

  const result = await apiLoad<unknown>("/organization/hospitals", { query: { per_page: 1 } });
  if (!result.ok) return <ErrorNotice error={result.error} />;
  const hospital = parseHospital(result.data);
  if (!hospital) return <EmptyState title="No hospital" description="No hospital profile was found." />;

  const address = [hospital.line1, hospital.line2, [hospital.city, hospital.state].filter(Boolean).join(", "), hospital.pincode].filter(Boolean).join(", ");

  return (
    <>
      <PageHeader title="Hospital profile" description={`${hospital.name} \u00b7 code ${hospital.code}`} />
      {can(p, "organization.hospital.manage") ? (
        <HospitalForm hospital={hospital} />
      ) : (
        <DetailList
          items={[
            { label: "Name", value: hospital.name },
            { label: "Registration no.", value: hospital.registrationNo },
            { label: "GSTIN", value: hospital.gstin },
            { label: "PAN", value: hospital.pan },
            { label: "Address", value: address },
            { label: "Phone", value: hospital.phone },
            { label: "Email", value: hospital.email },
            { label: "Timezone", value: hospital.timezone },
            { label: "Currency", value: hospital.currencyCode },
            { label: "Date format", value: hospital.dateFormat },
          ]}
        />
      )}
    </>
  );
}