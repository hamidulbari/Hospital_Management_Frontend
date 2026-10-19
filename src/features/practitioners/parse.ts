import type { Option } from "@/components/ui/select-field";
import { parsePage, type PageInfo } from "@/lib/api/meta";
import { shortTime } from "@/lib/time-input";
import { bool, list, num, rec, str, strOrNull, type Rec } from "@/lib/utils/guards";
import { nameOf } from "@/lib/utils/names";

export type SpecItem = { id: string; name: string; isPrimary: boolean };
export type SpecOption = { id: string; code: string; name: string };
export type CredentialItem = {
  id: string;
  type: string;
  number: string;
  issuingBody: string;
  issuedOn: string | null;
  expiresOn: string | null;
  status: string;
  expired: boolean;
};
export type PractitionerDetail = {
  id: string;
  name: string;
  type: string;
  status: string;
  departmentId: string;
  departmentName: string;
  /** The profile carries only the id of its login account, not a name. */
  userId: string;
  linkedUser: string;
  joinedOn: string | null;
  leftOn: string | null;
  specializations: SpecItem[];
  credentials: CredentialItem[];
};
export type PractitionerRow = { id: string; name: string; type: string; status: string; specialization: string; department: string };
export type RuleItem = { id: string; weekday: number; start: string; end: string; slotMinutes: string; validFrom: string | null; validUntil: string | null };
export type ExceptionItem = { id: string; date: string; kind: string; start: string; end: string; reason: string | null };

function text(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return str(value);
}

function parseSpec(raw: unknown): SpecItem {
  const s = rec(raw);
  return { id: str(s.id), name: nameOf(s), isPrimary: bool(s.is_primary) || bool(rec(s.pivot).is_primary) };
}

function parseCredential(raw: unknown): CredentialItem {
  const c = rec(raw);
  return {
    id: str(c.id),
    type: str(c.credential_type) || str(c.type),
    number: str(c.registration_number),
    issuingBody: str(c.issuing_body),
    issuedOn: strOrNull(c.issued_on),
    expiresOn: strOrNull(c.expires_on),
    status: str(c.verification_status) || str(c.status),
    expired: bool(c.is_expired),
  };
}

export function parsePractitioner(body: unknown): PractitionerDetail {
  const p = rec(rec(body).data);
  const department = rec(p.primary_department ?? p.department);
  return {
    id: str(p.id),
    name: nameOf(p),
    type: str(p.practitioner_type) || str(p.type),
    status: str(p.status),
    departmentId: str(p.primary_department_id) || str(department.id),
    departmentName: nameOf(department),
    userId: str(p.user_id) || str(rec(p.user).id),
    linkedUser: nameOf(p.user) || str(rec(p.user).email),
    joinedOn: strOrNull(p.joined_on),
    leftOn: strOrNull(p.left_on),
    specializations: list(p.specializations).map(parseSpec),
    credentials: list(p.credentials).map(parseCredential),
  };
}

export function parsePractitionerList(body: unknown): { items: PractitionerRow[] } & PageInfo {
  const items = list(rec(body).data).map((raw) => {
    const p = rec(raw);
    const specs = list(p.specializations).map(parseSpec);
    const main = specs.find((s) => s.isPrimary) ?? specs[0];
    return {
      id: str(p.id),
      name: nameOf(p),
      type: str(p.practitioner_type) || str(p.type),
      status: str(p.status),
      specialization: main?.name ?? "",
      department: nameOf(p.primary_department ?? p.department),
    };
  });
  return { items, ...parsePage(body, items.length) };
}

export function parseRules(body: unknown): RuleItem[] {
  return list(rec(body).data)
    .map((raw) => {
      const r = rec(raw);
      return {
        id: str(r.id),
        weekday: num(r.weekday) ?? Number(str(r.weekday)),
        start: shortTime(str(r.start_time)),
        end: shortTime(str(r.end_time)),
        slotMinutes: text(r.slot_minutes),
        validFrom: strOrNull(r.valid_from),
        validUntil: strOrNull(r.valid_until),
      };
    })
    .sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start));
}

export function parseExceptions(body: unknown): ExceptionItem[] {
  return list(rec(body).data)
    .map((raw) => {
      const e = rec(raw);
      return {
        id: str(e.id),
        date: str(e.exception_date) || str(e.date),
        kind: str(e.kind),
        start: shortTime(str(e.start_time)),
        end: shortTime(str(e.end_time)),
        reason: strOrNull(e.reason),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function parseOptionList(body: unknown, label: (o: Rec) => string): Option[] {
  return list(rec(body).data)
    .map((raw) => ({ value: str(rec(raw).id), label: label(rec(raw)) }))
    .filter((o) => o.value && o.label);
}

export function parseSpecOptions(body: unknown): SpecOption[] {
  return list(rec(body).data)
    .map((raw) => ({ id: str(rec(raw).id), code: str(rec(raw).code), name: nameOf(raw) }))
    .filter((s) => s.id && s.name);
}
