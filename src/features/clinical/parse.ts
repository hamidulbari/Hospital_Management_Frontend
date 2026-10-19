import { parsePage, type PageInfo } from "@/lib/api/meta";
import { list, rec, str, strOrNull, type Rec } from "@/lib/utils/guards";
import { nameOf } from "@/lib/utils/names";

export type VitalItem = { id: string; code: string; value: string; unit: string; status: string; reason: string | null; recordedAt: string | null };
export type NoteVersion = { id: string; number: string; status: string; body: string; reason: string | null; signedAt: string | null; author: string };
export type NoteItem = { id: string; noteType: string; signed: NoteVersion | null; draft: NoteVersion | null };
export type DiagnosisItem = { id: string; codeSystem: string; code: string; display: string; type: string; status: string };

export type EncounterDetail = {
  id: string;
  status: string;
  type: string;
  chiefComplaint: string | null;
  patientName: string;
  patientMrn: string;
  practitionerName: string;
  appointmentId: string;
  vitals: VitalItem[];
  notes: NoteItem[];
  diagnoses: DiagnosisItem[];
};

export type EncounterRow = {
  id: string;
  status: string;
  type: string;
  patientName: string;
  patientMrn: string;
  practitionerName: string;
};

function text(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return str(value);
}

function firstList(source: Rec, keys: string[]): unknown[] {
  for (const key of keys) {
    const found = list(source[key]);
    if (found.length > 0) return found;
  }
  return [];
}

function parseVital(raw: unknown): VitalItem {
  const o = rec(raw);
  return {
    id: str(o.id),
    code: str(o.code),
    value: text(o.value) || text(o.value_numeric),
    unit: str(o.unit),
    status: str(o.status),
    reason: strOrNull(o.error_reason) ?? strOrNull(o.reason),
    recordedAt: strOrNull(o.recorded_at) ?? strOrNull(o.observed_at) ?? strOrNull(o.created_at),
  };
}

export function parseVersion(raw: unknown): NoteVersion {
  const o = rec(raw);
  return {
    id: str(o.id),
    number: text(o.version) || text(o.version_number) || text(o.number),
    status: str(o.status),
    body: str(o.body),
    reason: strOrNull(o.reason) ?? strOrNull(o.amendment_reason),
    signedAt: strOrNull(o.signed_at),
    author: nameOf(o.author ?? o.signed_by ?? o.created_by) || str(o.author_name),
  };
}

function parseNote(raw: unknown): NoteItem {
  const n = rec(raw);
  const versions = list(n.versions).map(parseVersion);

  // Both are typed "NoteVersion or null" on purpose: they can be filled in, or cleared, further down.
  let signed: NoteVersion | null = versions.filter((v) => v.status === "signed").slice(-1)[0] ?? null;
  let draft: NoteVersion | null = versions.find((v) => v.status === "draft") ?? null;

  const pick = (...keys: string[]): NoteVersion | null => {
    for (const key of keys) {
      const value = n[key];
      if (typeof value === "object" && value !== null && !Array.isArray(value)) return parseVersion(value);
    }
    return null;
  };
  if (!signed) signed = pick("signed", "signed_version", "current_version", "current");
  if (!draft) draft = pick("draft", "draft_version", "own_draft");
  if (signed && signed.status === "draft" && !draft) {
    draft = signed;
    signed = null;
  }
  if (!signed && !draft && "body" in n) {
    const self = parseVersion(n);
    if (self.status === "draft") draft = self;
    else signed = self;
  }

  return { id: str(n.id), noteType: str(n.note_type) || str(n.type), signed, draft };
}

function parseDiagnosis(raw: unknown): DiagnosisItem {
  const d = rec(raw);
  return {
    id: str(d.id),
    codeSystem: str(d.code_system),
    code: str(d.code),
    display: str(d.display),
    type: str(d.diagnosis_type) || str(d.type),
    status: str(d.status),
  };
}

export function parseEncounter(body: unknown): EncounterDetail {
  const e = rec(rec(body).data);
  const patient = rec(e.patient);
  const practitioner = rec(e.practitioner);
  return {
    id: str(e.id),
    status: str(e.status),
    type: str(e.encounter_type) || str(e.type),
    chiefComplaint: strOrNull(e.chief_complaint),
    patientName: nameOf(patient) || str(e.patient_name),
    patientMrn: str(patient.mrn) || str(e.patient_mrn),
    practitionerName: nameOf(practitioner) || str(e.practitioner_name),
    appointmentId: str(e.appointment_id) || str(rec(e.appointment).id),
    vitals: firstList(e, ["vital_signs", "vitals", "observations"]).map(parseVital),
    notes: list(e.notes).map(parseNote),
    diagnoses: list(e.diagnoses).map(parseDiagnosis),
  };
}

export function parseEncounterList(body: unknown): { items: EncounterRow[] } & PageInfo {
  const items = list(rec(body).data).map((raw) => {
    const e = rec(raw);
    const patient = rec(e.patient);
    const practitioner = rec(e.practitioner);
    return {
      id: str(e.id),
      status: str(e.status),
      type: str(e.encounter_type) || str(e.type),
      patientName: nameOf(patient) || str(e.patient_name),
      patientMrn: str(patient.mrn) || str(e.patient_mrn),
      practitionerName: nameOf(practitioner) || str(e.practitioner_name),
    };
  });
  return { items, ...parsePage(body, items.length) };
}

export function parseVersions(body: unknown): NoteVersion[] {
  return list(rec(body).data).map(parseVersion);
}