import { notFound } from "next/navigation";
import { LinkButton } from "@/components/ui/link-button";
import { NoAccess } from "@/components/ui/no-access";
import { ErrorNotice, Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { StatusBadge } from "@/components/ui/status-badge";
import { labelFor } from "@/features/patients/options";
import { CredentialsPanel } from "@/features/practitioners/credentials-panel";
import { EditPractitioner } from "@/features/practitioners/edit-practitioner";
import { ExceptionsPanel } from "@/features/practitioners/exceptions-panel";
import { PRACTITIONER_STATUS_OPTIONS, PRACTITIONER_TYPE_OPTIONS, practitionerTone } from "@/features/practitioners/options";
import { parseExceptions, parsePractitioner, parseRules } from "@/features/practitioners/parse";
import { RulesPanel } from "@/features/practitioners/rules-panel";
import { loadDepartmentOptions, loadSpecializations } from "@/features/practitioners/server";
import { SpecializationsPanel } from "@/features/practitioners/specializations-panel";
import { apiLoad } from "@/lib/api/load";
import { requireSession } from "@/lib/auth/session";
import { formatLocalDate } from "@/lib/datetime";
import { can } from "@/lib/permissions";

export default async function PractitionerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  if (!/^[0-9a-z]{26}$/i.test(id)) notFound();
  const p = session.permissions;
  if (!can(p, "practitioner.view")) return <NoAccess />;
  const canManage = can(p, "practitioner.manage");

  const [result, rulesResult, exceptionsResult, specializations, departments] = await Promise.all([
    apiLoad<unknown>(`/practitioners/${id}`),
    apiLoad<unknown>(`/practitioners/${id}/availability-rules`),
    apiLoad<unknown>(`/practitioners/${id}/availability-exceptions`),
    canManage ? loadSpecializations() : Promise.resolve([]),
    canManage ? loadDepartmentOptions() : Promise.resolve([]),
  ]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    if (result.error.status === 403) return <NoAccess />;
    return <ErrorNotice error={result.error} />;
  }

  const practitioner = parsePractitioner(result.data);
  const rules = rulesResult.ok ? parseRules(rulesResult.data) : [];
  const exceptions = exceptionsResult.ok ? parseExceptions(exceptionsResult.data) : [];

  return (
    <>
      <PageHeader
        title={practitioner.name || "Practitioner"}
        description={[
          practitioner.type ? labelFor(PRACTITIONER_TYPE_OPTIONS, practitioner.type) : "",
          practitioner.departmentName,
          practitioner.linkedUser ? `Login: ${practitioner.linkedUser}` : "",
          practitioner.joinedOn ? `Joined ${formatLocalDate(practitioner.joinedOn)}` : "",
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge label={labelFor(PRACTITIONER_STATUS_OPTIONS, practitioner.status)} tone={practitionerTone(practitioner.status)} />
            {canManage ? <EditPractitioner practitioner={practitioner} departments={departments} /> : null}
            <LinkButton href="/admin/practitioners" variant="secondary">All practitioners</LinkButton>
          </div>
        }
      />

      <div className="flex flex-col gap-10">
        {!rulesResult.ok ? <ErrorNotice error={rulesResult.error} /> : null}
        {rulesResult.ok && rules.length === 0 && practitioner.status === "active" ? (
          <Notice>This practitioner has no working hours yet, so no free slots can be booked. Add them below.</Notice>
        ) : null}

        <Section title="Working hours">
          <RulesPanel practitionerId={id} rules={rules} canManage={canManage} />
        </Section>

        <Section title="Leave and extra hours">
          <ExceptionsPanel practitionerId={id} exceptions={exceptions} canManage={canManage} />
        </Section>

        <Section title="Specializations">
          <SpecializationsPanel practitionerId={id} current={practitioner.specializations} all={specializations} canManage={canManage} />
        </Section>

        <Section title="Credentials">
          <CredentialsPanel
            practitionerId={id}
            credentials={practitioner.credentials}
            canManage={canManage}
            canVerify={can(p, "practitioner.credential.verify")}
          />
        </Section>
      </div>
    </>
  );
}