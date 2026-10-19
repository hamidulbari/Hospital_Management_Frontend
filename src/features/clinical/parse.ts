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
    recordedAt: strOrNull(o.observed_at) ?? strOrNull(o.recorded_at) ?? strOrNull(o.created_at),
  };
}

/** The person who wrote or signed a version. The server sends a plain text; an object is read too. */
function authorOf(o: Rec): string {
  const value = o.author ?? o.signed_by ?? o.created_by;
  if (typeof value === "string") return value;
  return nameOf(value) || str(o.author_name);
}

/** A version of a note. "current" and "draft" carry no status of their own, so the caller says what they are. */
export function parseVersion(raw: unknown, defaultStatus = ""): NoteVersion {
  const o = rec(raw);
  return {
    id: str(o.id),
    number: text(o.version) || text(o.version_number) || text(o.number),
    status: str(o.status) || defaultStatus,
    body: str(o.body),
    reason: strOrNull(o.amendment_reason) ?? strOrNull(o.reason),
    signedAt: strOrNull(o.signed_at),
    author: authorOf(o),
  };
}

function parseNote(raw: unknown): NoteItem {
  const n = rec(raw);

  // Real shape: { current: {version, body, signed_at, signed_by, ...} | null, draft: {version, body, ...} | null }.
  const section = (key: string, status: string): NoteVersion | null => {
    const value = n[key];
    return typeof value === "object" && value !== null && !Array.isArray(value) ? parseVersion(value, status) : null;
  };
  let signed: NoteVersion | null = section("current", "signed");
  let draft: NoteVersion | null = section("draft", "draft");

  // Older or unexpected shapes: a list of versions, or the note itself carrying a body.
  const versions = list(n.versions).map((v) => parseVersion(v));
  if (!signed) signed = versions.filter((v) => v.status === "signed").slice(-1)[0] ?? null;
  if (!draft) draft = versions.find((v) => v.status === "draft") ?? null;
  if (!signed && !draft && "body" in n) {
    const self = parseVersion(n);
    if (self.status === "draft") draft = self;
    else signed = { ...self, status: self.status || "signed" };
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
    vitals: firstList(e, ["observations", "vital_signs", "vitals"]).map(parseVital),
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
  return list(rec(body).data).map((raw) => parseVersion(raw));
}
