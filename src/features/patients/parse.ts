import { bool, list, num, rec, str, strOrNull } from "@/lib/utils/guards";

export type PatientContact = { name: string; relationship: string; phone: string; isEmergency: boolean; isRepresentative: boolean };
export type PatientIdentifier = { type: string; value: string };
export type PatientConsent = { id: string; type: string; method: string; givenBy: string; status: string; withdrawn: boolean };

export type Patient = {
  id: string;
  mrn: string;
  displayName: string;
  sexAtBirth: string;
  dateOfBirth: string | null;
  estimatedAgeYears: number | null;
  phone: string; // shown exactly as the API returns it (masked)
  email: string | null;
  bloodGroup: string | null;
  preferredLanguage: string | null;
  contacts: PatientContact[];
  identifiers: PatientIdentifier[];
  consents: PatientConsent[];
};

export type PatientSearchResult = { items: Patient[]; currentPage: number; lastPage: number; total: number };

function parseConsent(raw: unknown): PatientConsent {
  const c = rec(raw);
  const status = str(c.status);
  return {
    id: str(c.id),
    type: str(c.type),
    method: str(c.method),
    givenBy: str(c.given_by),
    status,
    withdrawn: status === "withdrawn" || strOrNull(c.withdrawn_at) !== null,
  };
}

export function parsePatient(raw: unknown): Patient {
  const p = rec(raw);
  const built = [p.title, p.first_name, p.middle_name, p.last_name].map(str).filter(Boolean).join(" ");

  return {
    id: str(p.id),
    mrn: str(p.mrn),
    displayName: str(p.full_name) || built,
    sexAtBirth: str(p.sex_at_birth),
    dateOfBirth: strOrNull(p.date_of_birth),
    estimatedAgeYears: num(p.estimated_age_years),
    phone: str(p.phone),
    email: strOrNull(p.email),
    bloodGroup: strOrNull(p.blood_group),
    preferredLanguage: strOrNull(p.preferred_language),
    contacts: list(p.contacts).map((item) => {
      const c = rec(item);
      return {
        name: str(c.name),
        relationship: str(c.relationship),
        phone: str(c.phone),
        isEmergency: bool(c.is_emergency),
        isRepresentative: bool(c.is_authorized_representative),
      };
    }),
    identifiers: list(p.identifiers).map((item) => {
      const i = rec(item);
      return { type: str(i.id_type), value: str(i.value) };
    }),
    consents: list(p.consents).map(parseConsent),
  };
}

export function parsePatientList(body: unknown): PatientSearchResult {
  const root = rec(body);
  const meta = rec(root.meta);
  const items = list(root.data).map(parsePatient);
  return {
    items,
    currentPage: num(meta.current_page) ?? 1,
    lastPage: num(meta.last_page) ?? 1,
    total: num(meta.total) ?? items.length,
  };
}