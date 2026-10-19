import { notFound } from "next/navigation";
import { DetailList } from "@/components/ui/detail-list";
import { LinkButton } from "@/components/ui/link-button";
import { NoAccess } from "@/components/ui/no-access";
import { ErrorNotice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { ConsentsPanel } from "@/features/patients/consents-panel";
import {
  BLOOD_GROUP_OPTIONS,
  SEX_OPTIONS,
  labelFor,
} from "@/features/patients/options";
import { parsePatient } from "@/features/patients/parse";
import { apiLoad } from "@/lib/api/load";
import { formatAge } from "@/lib/age";
import { requireSession } from "@/lib/auth/session";
import { localTodayIso } from "@/lib/calendar";
import { formatLocalDate } from "@/lib/datetime";
import { humanize } from "@/lib/format";
import { can } from "@/lib/permissions";
import { rec } from "@/lib/utils/guards";

export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  if (!/^[0-9a-z]{26}$/i.test(id)) notFound();
  if (!can(session.permissions, "patient.view")) return <NoAccess />;

  const result = await apiLoad<unknown>(`/patients/${id}`);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    if (result.error.status === 403) return <NoAccess />;
    return <ErrorNotice error={result.error} />;
  }

  const patient = parsePatient(rec(result.data).data);

  // Age is worked out from the date of birth. The estimate is shown only when there is no date of birth.
  const age = patient.dateOfBirth ? formatAge(patient.dateOfBirth, localTodayIso()) : "";
  const dateOfBirth = patient.dateOfBirth
    ? `${formatLocalDate(patient.dateOfBirth)}${age ? ` (${age})` : ""}`
    : patient.estimatedAgeYears !== null
      ? `About ${patient.estimatedAgeYears} years (estimated)`
      : "";

  return (
    <>
      <PageHeader
        title={patient.displayName || "Patient"}
        description={patient.mrn ? `MRN ${patient.mrn}` : undefined}
        actions={
          <LinkButton href="/patients" variant="secondary">
            Back to search
          </LinkButton>
        }
      />
      <div className="flex flex-col gap-10">
        <Section title="Details">
          <DetailList
            items={[
              {
                label: "Sex at birth",
                value: patient.sexAtBirth
                  ? labelFor(SEX_OPTIONS, patient.sexAtBirth)
                  : "",
              },
              { label: "Date of birth", value: dateOfBirth },
              {
                label: "Blood group",
                value: patient.bloodGroup
                  ? labelFor(BLOOD_GROUP_OPTIONS, patient.bloodGroup)
                  : "",
              },
              { label: "Phone", value: patient.phone },
              { label: "Email", value: patient.email ?? "" },
              {
                label: "Preferred language",
                value: patient.preferredLanguage ?? "",
              },
            ]}
          />
        </Section>

        <Section title="Contacts">
          {patient.contacts.length === 0 ? (
            <p className="text-sm text-muted">No contacts recorded.</p>
          ) : (
            <ul className="border border-ink bg-surface">
              {patient.contacts.map((contact, index) => (
                <li
                  key={index}
                  className="border-b border-accent p-4 text-sm last:border-b-0"
                >
                  <p className="font-medium text-ink">{contact.name}</p>
                  <p className="text-xs text-muted">
                    {[
                      contact.relationship,
                      contact.phone,
                      contact.isEmergency ? "Emergency contact" : "",
                      contact.isRepresentative
                        ? "Authorized representative"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Identifiers">
          {patient.identifiers.length === 0 ? (
            <p className="text-sm text-muted">No identifiers recorded.</p>
          ) : (
            <DetailList
              items={patient.identifiers.map((i) => ({
                label: humanize(i.type),
                value: i.value,
              }))}
            />
          )}
        </Section>

        <Section title="Consents">
          <ConsentsPanel
            patientId={patient.id || id}
            consents={patient.consents}
            canManage={can(session.permissions, "patient.consent.manage")}
          />
        </Section>
      </div>
    </>
  );
}