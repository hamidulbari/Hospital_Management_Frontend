import { notFound } from "next/navigation";
import { LinkButton } from "@/components/ui/link-button";
import { NoAccess } from "@/components/ui/no-access";
import { ErrorNotice, Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { StatusBadge } from "@/components/ui/status-badge";
import { DiagnosesPanel } from "@/features/clinical/diagnoses-panel";
import { FinishEncounter } from "@/features/clinical/finish-encounter";
import { NotesPanel } from "@/features/clinical/notes-panel";
import { ENCOUNTER_STATUS_OPTIONS, ENCOUNTER_TYPE_OPTIONS, clinicalTone } from "@/features/clinical/options";
import { parseEncounter } from "@/features/clinical/parse";
import { VitalsPanel } from "@/features/clinical/vitals-panel";
import { labelFor } from "@/features/patients/options";
import { apiLoad } from "@/lib/api/load";
import { requireSession } from "@/lib/auth/session";
import { hospitalNow } from "@/lib/hospital";
import { can } from "@/lib/permissions";

export default async function EncounterPage({ params }: { params: Promise<{ encounterId: string }> }) {
  const session = await requireSession();
  const { encounterId } = await params;
  if (!/^[0-9a-z]{26}$/i.test(encounterId)) notFound();
  if (!can(session.permissions, "clinical.encounter.view")) return <NoAccess />;

  const [result, now] = await Promise.all([apiLoad<unknown>(`/encounters/${encounterId}`), hospitalNow()]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    if (result.error.status === 403) return <NoAccess />;
    return <ErrorNotice error={result.error} />;
  }

  const encounter = parseEncounter(result.data);
  const open = encounter.status === "open";
  const permissions = session.permissions;

  return (
    <>
      <PageHeader
        title={encounter.patientName || "Patient"}
        description={[
          encounter.patientMrn ? `MRN ${encounter.patientMrn}` : "",
          encounter.type ? labelFor(ENCOUNTER_TYPE_OPTIONS, encounter.type) : "",
          encounter.practitionerName,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge label={labelFor(ENCOUNTER_STATUS_OPTIONS, encounter.status)} tone={clinicalTone(encounter.status)} />
            <LinkButton href="/consultation" variant="secondary">All consultations</LinkButton>
          </div>
        }
      />

      <div className="flex flex-col gap-10">
        {encounter.chiefComplaint ? (
          <Section title="Chief complaint">
            <p className="whitespace-pre-wrap text-sm text-ink">{encounter.chiefComplaint}</p>
          </Section>
        ) : null}

        {!open ? <Notice>This encounter is finished. It can be read, but nothing can be added.</Notice> : null}

        <Section title="Vital signs">
          <VitalsPanel
            encounterId={encounterId}
            vitals={encounter.vitals}
            canRecord={can(permissions, "clinical.vitals.record")}
            open={open}
            timezone={now.timezone}
          />
        </Section>

        <Section title="Notes">
          <NotesPanel
            encounterId={encounterId}
            notes={encounter.notes}
            open={open}
            canWrite={can(permissions, "clinical.note.write")}
            canSign={can(permissions, "clinical.note.sign")}
            timezone={now.timezone}
          />
        </Section>

        <Section title="Diagnoses">
          <DiagnosesPanel
            encounterId={encounterId}
            diagnoses={encounter.diagnoses}
            open={open}
            canWrite={can(permissions, "clinical.diagnosis.write")}
          />
        </Section>

        {open && can(permissions, "clinical.encounter.write") ? (
          <FinishEncounter encounterId={encounterId} appointmentId={encounter.appointmentId} />
        ) : null}
      </div>
    </>
  );
}