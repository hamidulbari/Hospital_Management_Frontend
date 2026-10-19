$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath 'package.json') -or -not (Test-Path -LiteralPath 'src/app')) {
  throw 'Run this inside the frontend folder (the one with package.json and src).'
}
$root = (Get-Location).Path
$backup = Join-Path $root ('.sync-backup\' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$utf8 = New-Object System.Text.UTF8Encoding($false)
$written = New-Object System.Collections.ArrayList
$removed = New-Object System.Collections.ArrayList

function Save-File([string]$rel, [string]$text) {
  $full = [System.IO.Path]::GetFullPath((Join-Path $root $rel))
  if (Test-Path -LiteralPath $full) {
    $copy = [System.IO.Path]::GetFullPath((Join-Path $backup $rel))
    New-Item -ItemType Directory -Force -Path (Split-Path $copy) | Out-Null
    Copy-Item -LiteralPath $full -Destination $copy -Force
  }
  New-Item -ItemType Directory -Force -Path (Split-Path $full) | Out-Null
  [System.IO.File]::WriteAllText($full, $text, $utf8)
  [void]$written.Add($rel)
}

function Remove-File([string]$rel) {
  $full = [System.IO.Path]::GetFullPath((Join-Path $root $rel))
  if (Test-Path -LiteralPath $full) {
    $copy = [System.IO.Path]::GetFullPath((Join-Path $backup $rel))
    New-Item -ItemType Directory -Force -Path (Split-Path $copy) | Out-Null
    Move-Item -LiteralPath $full -Destination $copy -Force
    [void]$removed.Add($rel)
  }
}

# ================================================================ lib: permissions, session, hospital

Save-File 'src/lib/permissions.ts' @'
export type PermissionCode =
  | "organization.hospital.view" | "organization.hospital.manage"
  | "organization.branch.view" | "organization.branch.manage"
  | "organization.department.view" | "organization.department.manage"
  | "identity.user.view" | "identity.user.manage" | "identity.user.assign_roles" | "identity.role.view"
  | "audit.event.view" | "system.docs.view"
  | "practitioner.view" | "practitioner.manage" | "practitioner.credential.verify"
  | "appointment.view" | "appointment.book" | "appointment.cancel" | "appointment.checkin"
  | "appointment.consult" | "appointment.consult.any"
  | "clinical.encounter.view" | "clinical.encounter.write" | "clinical.vitals.record"
  | "clinical.note.write" | "clinical.note.sign" | "clinical.diagnosis.write"
  | "billing.service.view" | "billing.service.manage"
  | "billing.invoice.view" | "billing.invoice.create" | "billing.invoice.issue" | "billing.invoice.cancel"
  | "billing.discount.apply" | "billing.payment.record" | "billing.payment.reverse" | "billing.statement.view"
  | "patient.view" | "patient.register" | "patient.consent.manage" | "patient.list"
  | "dashboard.view";

/** Comfort only: the server decides, and every 403 must still be handled. */
export function can(permissions: readonly string[], code: PermissionCode): boolean {
  return permissions.includes(code);
}

export function canAny(permissions: readonly string[], codes: readonly PermissionCode[]): boolean {
  return codes.some((code) => permissions.includes(code));
}

export function canAll(permissions: readonly string[], codes: readonly PermissionCode[]): boolean {
  return codes.every((code) => permissions.includes(code));
}
'@

Save-File 'src/lib/auth/me.ts' @'
import { rec, str } from "@/lib/utils/guards";

export type SessionHospital = {
  id: string;
  name: string;
  timezone: string;
  currencyCode: string;
  dateFormat: string;
  locale: string;
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  mustChangePassword: boolean;
  permissions: string[];
  /** From GET /identity/me, for every user. null for a group-level user who has no hospital. */
  hospital: SessionHospital | null;
};

/** GET /identity/me answers { data: { id, full_name, email, must_change_password, permissions, hospital: {...}, ... } } (schema confirmed). */
export function parseMe(body: unknown): SessionUser {
  const data = rec(rec(body).data);
  const user = rec(data.user ?? data);
  const rawPermissions = data.permissions ?? user.permissions;
  const permissions = Array.isArray(rawPermissions)
    ? rawPermissions.filter((p): p is string => typeof p === "string")
    : [];
  const email = str(user.email);
  const h = rec(data.hospital ?? user.hospital);
  const timezone = str(h.timezone);

  return {
    id: str(user.id),
    name: str(user.full_name) || str(user.name) || email || "User",
    email,
    mustChangePassword: data.must_change_password === true || user.must_change_password === true,
    permissions,
    hospital: timezone
      ? {
          id: str(h.id),
          name: str(h.name),
          timezone,
          currencyCode: str(h.currency_code),
          dateFormat: str(h.date_format),
          locale: str(h.locale),
        }
      : null,
  };
}
'@

Save-File 'src/lib/auth/me.test.ts' @'
import { describe, expect, it } from "vitest";
import { parseMe } from "./me";

describe("parseMe", () => {
  it("reads the real /identity/me shape with the hospital block", () => {
    const me = parseMe({
      data: {
        id: "01A",
        full_name: "Admin Name",
        email: "a@x.org",
        must_change_password: false,
        permissions: ["patient.view"],
        hospital: { id: "h1", name: "City Hospital", timezone: "Asia/Kolkata", currency_code: "INR", date_format: "DD/MM/YYYY", locale: "en" },
      },
    });
    expect(me).toMatchObject({ id: "01A", name: "Admin Name", email: "a@x.org", mustChangePassword: false, permissions: ["patient.view"] });
    expect(me.hospital).toEqual({ id: "h1", name: "City Hospital", timezone: "Asia/Kolkata", currencyCode: "INR", dateFormat: "DD/MM/YYYY", locale: "en" });
  });
  it("has no hospital for a group-level user", () => {
    expect(parseMe({ data: { id: "01A", full_name: "Group User", hospital: null } }).hospital).toBeNull();
  });
  it("falls back to the email, then to User", () => {
    expect(parseMe({ data: { id: "01A", email: "a@x.org" } }).name).toBe("a@x.org");
    expect(parseMe(null)).toEqual({ id: "", name: "User", email: "", mustChangePassword: false, permissions: [], hospital: null });
  });
});
'@

Save-File 'src/lib/hospital.ts' @'
import "server-only";
import { cache } from "react";
import { apiLoad } from "@/lib/api/load";
import { getSession } from "@/lib/auth/session";
import { localTodayIso } from "@/lib/calendar";
import { localParts } from "@/lib/datetime";
import { list, rec, str } from "@/lib/utils/guards";

export type HospitalContext = { name: string; timezone: string; currencyCode: string; dateFormat: string; locale: string };

/**
 * The hospital of the signed-in user. It comes from GET /identity/me (no extra permission needed).
 * Only a group-level user, who has no hospital there, falls back to the hospital list (needs organization.hospital.view).
 */
export const getHospital = cache(async (): Promise<HospitalContext | null> => {
  const session = await getSession();
  const fromMe = session?.hospital;
  if (fromMe) {
    return { name: fromMe.name, timezone: fromMe.timezone, currencyCode: fromMe.currencyCode, dateFormat: fromMe.dateFormat, locale: fromMe.locale };
  }

  const result = await apiLoad<unknown>("/organization/hospitals", { query: { per_page: 1 } });
  if (!result.ok) return null;
  const first = rec(list(rec(result.data).data)[0]);
  const timezone = str(first.timezone);
  if (!timezone) return null;
  return {
    name: str(first.name),
    timezone,
    currencyCode: str(first.currency_code),
    dateFormat: str(first.date_format),
    locale: str(first.default_locale),
  };
});

/** Today and the time now in the hospital's timezone. Falls back to this computer's clock when there is no hospital. */
export async function hospitalNow(): Promise<{ today: string; time: string; timezone: string | null }> {
  const hospital = await getHospital();
  const parts = hospital ? localParts(new Date(), hospital.timezone) : null;
  if (hospital && parts) return { today: parts.date, time: parts.time, timezone: hospital.timezone };

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return { today: localTodayIso(now), time: `${pad(now.getHours())}:${pad(now.getMinutes())}`, timezone: null };
}
'@

# ================================================================ billing

Save-File 'src/features/billing/parse.ts' @'
import { parsePage, type PageInfo } from "@/lib/api/meta";
import { bool, list, num, rec, str, strOrNull, type Rec } from "@/lib/utils/guards";
import { nameOf } from "@/lib/utils/names";

export type ServiceItem = { id: string; code: string; name: string; category: string; unitPrice: string; taxPercent: string; active: boolean };
export type InvoiceLine = {
  serviceId: string;
  code: string;
  category: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxPercent: string;
  taxAmount: string;
  total: string;
  addedAt: string | null;
};
export type PaymentItem = { id: string; amount: string; method: string; reference: string; status: string; receipt: string; at: string | null; reason: string | null };
export type InvoiceHospital = { name: string; registrationNo: string; gstin: string; phone: string; email: string; city: string; state: string; pincode: string };
export type TaxRow = { percent: string; taxable: string; tax: string; total: string };
export type GroupTotal = { category: string; amount: string };

export type InvoiceDetail = {
  id: string;
  number: string;
  status: string;
  currency: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  patientSex: string;
  patientDob: string;
  patientAgeYears: number | null;
  patientDobEstimated: boolean;
  patientPhone: string;
  issuedAt: string | null;
  createdAt: string | null;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
  paid: string;
  balance: string;
  lines: InvoiceLine[];
  groupTotals: GroupTotal[];
  taxSummary: TaxRow[];
  payments: PaymentItem[];
  hospital: InvoiceHospital;
  consultants: string[];
};

export type InvoiceRow = { id: string; number: string; status: string; patientName: string; patientMrn: string; date: string | null; total: string; balance: string };
export type StatementInvoice = { id: string; number: string; status: string; date: string | null; total: string; paid: string; balance: string };
export type Statement = { patientName: string; patientMrn: string; currency: string; outstanding: string; invoices: StatementInvoice[] };

const CATEGORY_ORDER = ["consultation", "procedure", "investigation", "bed", "other"];

function text(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return str(value);
}

/** Money should arrive as a string. A number is only formatted for display, never calculated with. */
function moneyOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value.toFixed(2);
  return "";
}

function firstMoney(source: Rec, keys: string[]): string {
  for (const key of keys) {
    const found = moneyOf(source[key]);
    if (found) return found;
  }
  return "";
}

function firstText(source: Rec, keys: string[]): string {
  for (const key of keys) {
    const found = text(source[key]);
    if (found) return found;
  }
  return "";
}

function firstNullable(source: Rec, keys: string[]): string | null {
  for (const key of keys) {
    const found = strOrNull(source[key]);
    if (found) return found;
  }
  return null;
}

function numberOf(source: Rec): string {
  return firstText(source, ["invoice_no", "invoice_number", "number"]);
}

function parseLine(raw: unknown): InvoiceLine {
  const l = rec(raw);
  return {
    serviceId: str(l.service_id),
    code: str(l.service_code),
    category: str(l.category),
    description: str(l.description),
    quantity: text(l.quantity),
    unitPrice: firstMoney(l, ["unit_price"]),
    discount: firstMoney(l, ["discount_amount"]),
    taxPercent: firstMoney(l, ["tax_percent"]),
    taxAmount: firstMoney(l, ["tax_amount"]),
    total: firstMoney(l, ["line_total"]),
    addedAt: strOrNull(l.added_at),
  };
}

function parsePayment(raw: unknown): PaymentItem {
  const p = rec(raw);
  return {
    id: str(p.id),
    amount: firstMoney(p, ["amount"]),
    method: str(p.method),
    reference: str(p.reference),
    status: str(p.status),
    receipt: str(p.receipt_no),
    at: firstNullable(p, ["received_at", "reversed_at"]),
    reason: strOrNull(p.reversal_reason),
  };
}

function orderOf(category: string): number {
  const index = CATEGORY_ORDER.indexOf(category);
  return index < 0 ? 99 : index;
}

/** group_totals: the server's sum per category (a keyed object, or a list). Never added up here. */
function groupTotalsOf(value: unknown): GroupTotal[] {
  const found: GroupTotal[] = [];
  if (Array.isArray(value)) {
    for (const raw of value) {
      const o = rec(raw);
      const category = str(o.category);
      const amount = firstMoney(o, ["total", "amount"]);
      if (category && amount) found.push({ category, amount });
    }
  } else {
    for (const [category, raw] of Object.entries(rec(value))) {
      const amount = typeof raw === "object" && raw !== null ? firstMoney(rec(raw), ["total", "amount"]) : moneyOf(raw);
      if (amount) found.push({ category, amount });
    }
  }
  return found.sort((a, b) => orderOf(a.category) - orderOf(b.category));
}

function hospitalOf(value: unknown): InvoiceHospital {
  const h = rec(value);
  return {
    name: str(h.name),
    registrationNo: str(h.registration_no),
    gstin: str(h.gstin),
    phone: str(h.phone),
    email: str(h.email),
    city: str(h.city),
    state: str(h.state),
    pincode: str(h.pincode),
  };
}

export function parseInvoice(body: unknown): InvoiceDetail {
  const i = rec(rec(body).data);
  const patient = rec(i.patient);
  return {
    id: str(i.id),
    number: numberOf(i),
    status: str(i.status),
    currency: str(i.currency),
    patientId: str(patient.id),
    patientName: nameOf(patient),
    patientMrn: str(patient.mrn),
    patientSex: str(patient.sex_at_birth),
    patientDob: str(patient.date_of_birth),
    patientAgeYears: num(patient.age_years),
    patientDobEstimated: bool(patient.dob_is_estimated),
    patientPhone: str(patient.phone_masked),
    issuedAt: strOrNull(i.issued_at),
    createdAt: strOrNull(i.created_at),
    subtotal: firstMoney(i, ["subtotal"]),
    discountTotal: firstMoney(i, ["discount_total"]),
    taxTotal: firstMoney(i, ["tax_total"]),
    total: firstMoney(i, ["total"]),
    paid: firstMoney(i, ["amount_paid"]),
    balance: firstMoney(i, ["balance"]),
    lines: list(i.lines).map(parseLine),
    groupTotals: groupTotalsOf(i.group_totals),
    taxSummary: list(i.tax_summary).map((raw) => {
      const r = rec(raw);
      return { percent: firstMoney(r, ["tax_percent"]), taxable: firstMoney(r, ["taxable_value"]), tax: firstMoney(r, ["tax_amount"]), total: firstMoney(r, ["total"]) };
    }),
    payments: list(i.payments).map(parsePayment),
    hospital: hospitalOf(i.hospital),
    consultants: list(i.consulting_practitioners).map((raw) => nameOf(raw)).filter(Boolean),
  };
}

/** The list answers with full invoices, but without lines and payments. The filter "date" means the day it was CREATED. */
export function parseInvoiceList(body: unknown): { items: InvoiceRow[] } & PageInfo {
  const items = list(rec(body).data).map((raw) => {
    const i = rec(raw);
    const patient = rec(i.patient);
    return {
      id: str(i.id),
      number: numberOf(i),
      status: str(i.status),
      patientName: nameOf(patient),
      patientMrn: str(patient.mrn),
      date: firstNullable(i, ["created_at", "issued_at"]),
      total: firstMoney(i, ["total"]),
      balance: firstMoney(i, ["balance"]),
    };
  });
  return { items, ...parsePage(body, items.length) };
}

export function parseStatement(body: unknown): Statement {
  const s = rec(rec(body).data);
  const patient = rec(s.patient);
  return {
    patientName: nameOf(patient),
    patientMrn: str(patient.mrn),
    currency: str(s.currency),
    outstanding: firstMoney(s, ["outstanding"]),
    invoices: list(s.invoices).map((raw) => {
      const i = rec(raw);
      return {
        id: str(i.id),
        number: numberOf(i),
        status: str(i.status),
        date: strOrNull(i.issued_at),
        total: firstMoney(i, ["total"]),
        paid: firstMoney(i, ["amount_paid"]),
        balance: firstMoney(i, ["balance"]),
      };
    }),
  };
}

export function parseServices(body: unknown): { items: ServiceItem[] } & PageInfo {
  const items = list(rec(body).data).map((raw) => {
    const s = rec(raw);
    return {
      id: str(s.id),
      code: str(s.code),
      name: str(s.name),
      category: str(s.category),
      unitPrice: firstMoney(s, ["unit_price"]),
      taxPercent: firstMoney(s, ["tax_percent"]),
      active: bool(s.is_active),
    };
  });
  return { items, ...parsePage(body, items.length) };
}
'@

Save-File 'src/features/billing/parse.test.ts' @'
import { describe, expect, it } from "vitest";
import { parseInvoice, parseInvoiceList, parseServices, parseStatement } from "./parse";

describe("parseInvoice (real schema)", () => {
  it("reads the server's strings, the hospital block and the print data", () => {
    const invoice = parseInvoice({
      data: {
        id: "i1", invoice_no: "INV-1", status: "issued", currency: "INR",
        patient: { id: "p1", mrn: "M1", full_name: "Asha Rao", sex_at_birth: "female", date_of_birth: null, dob_is_estimated: true, age_years: 34, phone_masked: "+91******3210" },
        total: "1170.00", amount_paid: "700.00", balance: "470.00", discount_total: "50.00", tax_total: "20.00", subtotal: "1200.00",
        lines: [{ line_no: 1, service_id: "s1", service_code: "CONS", category: "consultation", description: "Consultation", quantity: 1, unit_price: "500.00", discount_amount: "0.00", tax_percent: "0.00", tax_amount: "0.00", line_total: "500.00", added_at: "2026-10-19T10:00:00+00:00" }],
        group_totals: { other: "670.00", consultation: "500.00" },
        payments: [{ id: "pay1", receipt_no: "RCP-1", amount: "500.00", method: "cash", status: "posted", received_at: "2026-10-19T10:05:00+00:00" }],
        hospital: { name: "City Hospital", gstin: "27ABCDE1234F1Z5", city: "Pune", pincode: "411001", country_code: "IN" },
        consulting_practitioners: [{ id: "d1", full_name: "Dr Khan" }],
        tax_summary: [{ tax_percent: "5.00", taxable_value: "400.00", tax_amount: "20.00", total: "420.00" }],
      },
    });
    expect(invoice).toMatchObject({ number: "INV-1", paid: "700.00", balance: "470.00", patientPhone: "+91******3210", patientAgeYears: 34, patientDobEstimated: true, currency: "INR" });
    expect(invoice.lines[0]).toMatchObject({ code: "CONS", category: "consultation", unitPrice: "500.00", total: "500.00", quantity: "1", addedAt: "2026-10-19T10:00:00+00:00" });
    expect(invoice.payments[0]).toMatchObject({ receipt: "RCP-1", amount: "500.00", status: "posted", at: "2026-10-19T10:05:00+00:00" });
    expect(invoice.groupTotals).toEqual([{ category: "consultation", amount: "500.00" }, { category: "other", amount: "670.00" }]);
    expect(invoice.hospital).toMatchObject({ name: "City Hospital", gstin: "27ABCDE1234F1Z5", city: "Pune" });
    expect(invoice.consultants).toEqual(["Dr Khan"]);
    expect(invoice.taxSummary).toEqual([{ percent: "5.00", taxable: "400.00", tax: "20.00", total: "420.00" }]);
  });
  it("never throws on garbage", () => {
    const empty = parseInvoice(null);
    expect(empty.lines).toEqual([]);
    expect(empty.groupTotals).toEqual([]);
    expect(empty.number).toBe("");
  });
});

describe("list, statement and services", () => {
  it("reads the creation date for the list", () => {
    const { items } = parseInvoiceList({ data: [{ id: "i1", invoice_no: null, status: "draft", created_at: "2026-10-19T09:00:00+00:00", patient: { full_name: "A", mrn: "M1" }, total: "10.00", balance: "10.00" }] });
    expect(items[0]).toMatchObject({ number: "", status: "draft", date: "2026-10-19T09:00:00+00:00", total: "10.00" });
  });
  it("reads the statement and services", () => {
    expect(parseStatement({ data: { outstanding: "1200.00", currency: "INR", patient: { full_name: "A", mrn: "M1" }, invoices: [{ id: "i1", invoice_no: "INV-1", amount_paid: "0.00", balance: "1200.00" }] } })).toMatchObject({ outstanding: "1200.00", currency: "INR" });
    expect(parseServices({ data: [{ id: "s1", code: "C1", name: "Consultation", unit_price: "500.00", tax_percent: "0.00", is_active: true }] }).items[0]).toMatchObject({ unitPrice: "500.00", active: true });
  });
});
'@

Save-File 'src/features/billing/bill-groups.ts' @'
import type { GroupTotal, InvoiceLine } from "./parse";

export const CATEGORY_ORDER = ["consultation", "procedure", "investigation", "bed", "other"] as const;

const LABELS: Record<string, string> = {
  consultation: "Consultation charges",
  procedure: "Procedure charges",
  investigation: "Investigation charges",
  bed: "Room/Bed charges",
  other: "Other charges",
};

export type BillGroup = { key: string; label: string; lines: InvoiceLine[]; /** The server's sum for this category ("" when it did not send one). */ subtotal: string };

/**
 * Puts the lines under a heading per category, in a fixed order. The category comes from the server
 * ("other" for a line that is not in the price list). The subtotal is the server's own number: nothing is added up here.
 */
export function groupLines(lines: InvoiceLine[], totals: readonly GroupTotal[]): BillGroup[] {
  const groups = new Map<string, InvoiceLine[]>();
  for (const line of lines) {
    const key = (CATEGORY_ORDER as readonly string[]).includes(line.category) ? line.category : "other";
    groups.set(key, [...(groups.get(key) ?? []), line]);
  }
  return CATEGORY_ORDER.filter((key) => groups.has(key)).map((key) => ({
    key,
    label: LABELS[key],
    lines: groups.get(key) ?? [],
    subtotal: totals.find((t) => t.category === key)?.amount ?? "",
  }));
}
'@

Save-File 'src/features/billing/bill-groups.test.ts' @'
import { describe, expect, it } from "vitest";
import { groupLines } from "./bill-groups";
import type { InvoiceLine } from "./parse";

const line = (patch: Partial<InvoiceLine>): InvoiceLine => ({
  serviceId: "", code: "", category: "other", description: "x", quantity: "1", unitPrice: "1.00", discount: "", taxPercent: "", taxAmount: "", total: "1.00", addedAt: null, ...patch,
});

describe("groupLines", () => {
  it("groups by the server's category in a fixed order and keeps the server's subtotal", () => {
    const groups = groupLines(
      [line({ category: "bed" }), line({ category: "consultation" })],
      [{ category: "consultation", amount: "500.00" }, { category: "bed", amount: "200.00" }],
    );
    expect(groups.map((g) => g.label)).toEqual(["Consultation charges", "Room/Bed charges"]);
    expect(groups.map((g) => g.subtotal)).toEqual(["500.00", "200.00"]);
  });
  it("puts an unknown category under Other charges and shows no subtotal when the server sent none", () => {
    const groups = groupLines([line({ category: "weird" })], []);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ label: "Other charges", subtotal: "" });
  });
});
'@

Save-File 'src/features/billing/hospital-block.tsx' @'
export type PrintHospital = {
  name: string;
  registrationNo?: string;
  gstin?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  pincode?: string;
};

/** The hospital heading of a printed bill. Only what the server sent is shown. */
export function HospitalBlock({ hospital }: { hospital: PrintHospital }) {
  const place = [[hospital.city, hospital.state].filter(Boolean).join(", "), hospital.pincode].filter(Boolean).join(" - ");
  const contact = [hospital.phone ? `Ph: ${hospital.phone}` : "", hospital.email ?? ""].filter(Boolean).join(", ");

  return (
    <div className="text-[9pt] leading-snug">
      <p className="font-headline text-[17pt] font-bold leading-tight tracking-tight">{hospital.name || "HMS"}</p>
      {hospital.registrationNo ? <p className="mt-1">Reg. No. {hospital.registrationNo}</p> : null}
      {place ? <p>{place}</p> : null}
      {contact ? <p>{contact}</p> : null}
      {hospital.gstin ? <p>GSTIN: {hospital.gstin}</p> : null}
    </div>
  );
}
'@

Save-File 'src/features/billing/invoice-sheet.tsx' @'
import { SEX_OPTIONS, labelFor } from "@/features/patients/options";
import { showInstant } from "@/lib/format-instant";
import { groupLines } from "./bill-groups";
import { HospitalBlock } from "./hospital-block";
import { fmt, isZeroMoney, type MoneyFormat } from "./money-format";
import { amountInWords } from "./numbers-to-words";
import { INVOICE_STATUS_OPTIONS, PAYMENT_METHOD_OPTIONS } from "./options";
import type { InvoiceDetail } from "./parse";

type Props = {
  invoice: InvoiceDetail;
  moneyFormat: MoneyFormat;
  timezone: string | null;
  printedBy: string;
  printedAt: string;
};

const th = "py-1.5 font-headline text-[7.5pt] uppercase tracking-wider";
const td = "border-b border-[#e2e8f0] py-1.5 align-top";

function Info({ label, value }: { label: string; value: string }) {
  return value ? (
    <p>
      <span className="font-semibold">{label}:</span> {value}
    </p>
  ) : null;
}

/** The A4 paper version of a bill. Every amount, subtotal and tax figure is the server's. Nothing is added up here. */
export function InvoiceSheet({ invoice, moneyFormat, timezone, printedBy, printedAt }: Props) {
  const draft = invoice.status === "draft";
  const cancelled = invoice.status === "cancelled";
  const groups = groupLines(invoice.lines, invoice.groupTotals);
  const cellFormat: MoneyFormat = { ...moneyFormat, currency: undefined };
  const currency = invoice.currency || moneyFormat.currency;
  const sex = invoice.patientSex ? labelFor(SEX_OPTIONS, invoice.patientSex) : "";
  const age = invoice.patientAgeYears !== null ? `${invoice.patientAgeYears} years${invoice.patientDobEstimated ? " (estimated)" : ""}` : "";
  const paidWords = invoice.paid ? amountInWords(invoice.paid, currency) : "";
  const date = showInstant(invoice.issuedAt ?? invoice.createdAt, timezone);

  const totals = [
    { label: "Subtotal", value: invoice.subtotal },
    { label: "Discount", value: invoice.discountTotal },
    { label: "Tax", value: invoice.taxTotal },
    { label: "Total bill amount", value: invoice.total, strong: true },
    { label: "Amount paid", value: invoice.paid },
    { label: "Balance", value: invoice.balance, strong: true },
  ].filter((row) => row.value !== "");

  return (
    <div className="text-[9pt] leading-snug text-ink">
      <HospitalBlock hospital={invoice.hospital} />
      <hr className="my-3 border-ink" />

      <section className="grid grid-cols-2 gap-8">
        <div className="flex flex-col gap-0.5">
          <Info label="Patient MRN" value={invoice.patientMrn} />
          <Info label="Name" value={`${invoice.patientName}${sex ? ` (${sex})` : ""}`} />
          <Info label="Age" value={age} />
          <Info label="Contact" value={invoice.patientPhone} />
        </div>
        <div className="flex flex-col gap-0.5">
          <Info label="Date" value={date} />
          <Info label="Invoice No." value={invoice.number} />
          <Info label="Status" value={draft ? "Not issued" : labelFor(INVOICE_STATUS_OPTIONS, invoice.status)} />
          <Info label="Consulting doctor" value={invoice.consultants.join(", ")} />
        </div>
      </section>
      <hr className="my-3 border-ink" />

      <p className="text-center font-headline text-[11pt] font-bold uppercase tracking-widest">
        {draft ? "Provisional bill" : "Bill"}
        {cancelled ? <span className="text-error"> &mdash; Cancelled</span> : null}
      </p>
      {currency ? <p className="mt-1 text-center text-[8pt] text-muted">All amounts in {currency}</p> : null}

      <p className="mt-5 border-b border-ink pb-1 text-center font-headline text-[9pt] font-bold uppercase tracking-widest">Detailed breakup</p>
      <table className="w-full">
        <thead>
          <tr className="border-b border-ink">
            <th scope="col" className={`${th} w-[16mm] pr-2 text-left`}>Code</th>
            <th scope="col" className={`${th} w-[28mm] pr-2 text-left`}>Date &amp; time</th>
            <th scope="col" className={`${th} pr-2 text-left`}>Particulars</th>
            <th scope="col" className={`${th} pl-2 text-right`}>Rate</th>
            <th scope="col" className={`${th} pl-2 text-right`}>Units</th>
            <th scope="col" className={`${th} pl-2 text-right`}>Disc.</th>
            <th scope="col" className={`${th} pl-2 text-right`}>Tax %</th>
            <th scope="col" className={`${th} pl-2 text-right`}>Amount</th>
          </tr>
        </thead>
        {groups.length === 0 ? (
          <tbody>
            <tr>
              <td colSpan={8} className="py-3 text-muted">No lines.</td>
            </tr>
          </tbody>
        ) : (
          groups.map((group) => (
            <tbody key={group.key}>
              <tr>
                <td colSpan={8} className="pb-1 pt-3 font-headline text-[9pt] font-bold">{group.label}</td>
              </tr>
              {group.lines.map((line, index) => (
                <tr key={index}>
                  <td className={`${td} pr-2`}>{line.code || "\u2014"}</td>
                  <td className={`${td} whitespace-nowrap pr-2 text-[8pt]`}>{showInstant(line.addedAt, timezone) || "\u2014"}</td>
                  <td className={`${td} pr-2`}>{line.description || "\u2014"}</td>
                  <td className={`${td} pl-2 text-right tabular-nums`}>{fmt(line.unitPrice, cellFormat)}</td>
                  <td className={`${td} pl-2 text-right tabular-nums`}>{line.quantity || "\u2014"}</td>
                  <td className={`${td} pl-2 text-right tabular-nums`}>{line.discount && !isZeroMoney(line.discount) ? fmt(line.discount, cellFormat) : "\u2014"}</td>
                  <td className={`${td} pl-2 text-right tabular-nums`}>{line.taxPercent && !isZeroMoney(line.taxPercent) ? line.taxPercent : "\u2014"}</td>
                  <td className={`${td} pl-2 text-right font-semibold tabular-nums`}>{fmt(line.total, cellFormat)}</td>
                </tr>
              ))}
              {group.subtotal ? (
                <tr>
                  <td colSpan={7} className="pt-1.5 text-right text-[8.5pt] font-semibold">Subtotal</td>
                  <td className="pl-2 pt-1.5 text-right text-[8.5pt] font-semibold tabular-nums">{fmt(group.subtotal, cellFormat)}</td>
                </tr>
              ) : null}
            </tbody>
          ))
        )}
      </table>

      {totals.length > 0 ? (
        <div className="mt-5 flex justify-end">
          <dl className="w-[80mm]">
            {totals.map((row) => (
              <div
                key={row.label}
                className={row.strong ? "mt-1 flex justify-between border-t border-ink pt-1.5 text-[10.5pt] font-bold" : "flex justify-between py-0.5"}
              >
                <dt>{row.label}</dt>
                <dd className="tabular-nums">{fmt(row.value, moneyFormat)}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
      {paidWords ? (
        <p className="mt-2 text-right">
          <span className="font-semibold">Paid amount in words:</span> {paidWords}
        </p>
      ) : null}

      {invoice.taxSummary.length > 0 ? (
        <section className="mt-7">
          <p className="border-b border-ink pb-1 text-center font-headline text-[9pt] font-bold uppercase tracking-widest">Tax summary</p>
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink">
                <th scope="col" className={`${th} pr-2 text-left`}>Tax %</th>
                <th scope="col" className={`${th} pl-2 text-right`}>Taxable value</th>
                <th scope="col" className={`${th} pl-2 text-right`}>Tax</th>
                <th scope="col" className={`${th} pl-2 text-right`}>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.taxSummary.map((row, index) => (
                <tr key={index}>
                  <td className={`${td} pr-2`}>{row.percent}%</td>
                  <td className={`${td} pl-2 text-right tabular-nums`}>{fmt(row.taxable, cellFormat)}</td>
                  <td className={`${td} pl-2 text-right tabular-nums`}>{fmt(row.tax, cellFormat)}</td>
                  <td className={`${td} pl-2 text-right font-semibold tabular-nums`}>{fmt(row.total, cellFormat)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {invoice.payments.length > 0 ? (
        <section className="mt-7">
          <p className="border-b border-ink pb-1 text-center font-headline text-[9pt] font-bold uppercase tracking-widest">Payments</p>
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink">
                <th scope="col" className={`${th} pr-2 text-left`}>Receipt</th>
                <th scope="col" className={`${th} pr-2 text-left`}>Date</th>
                <th scope="col" className={`${th} pr-2 text-left`}>Method</th>
                <th scope="col" className={`${th} pr-2 text-left`}>Reference</th>
                <th scope="col" className={`${th} pl-2 text-right`}>Amount</th>
                <th scope="col" className={`${th} pl-2 text-right`}>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoice.payments.map((payment, index) => {
                const reversed = payment.status === "reversed";
                return (
                  <tr key={payment.id || index}>
                    <td className={`${td} pr-2 font-semibold`}>{payment.receipt || "\u2014"}</td>
                    <td className={`${td} pr-2`}>{showInstant(payment.at, timezone) || "\u2014"}</td>
                    <td className={`${td} pr-2`}>{payment.method ? labelFor(PAYMENT_METHOD_OPTIONS, payment.method) : "\u2014"}</td>
                    <td className={`${td} pr-2`}>{payment.reference || "\u2014"}</td>
                    <td className={`${td} pl-2 text-right tabular-nums ${reversed ? "text-muted line-through" : "font-semibold"}`}>
                      {fmt(payment.amount, cellFormat)}
                    </td>
                    <td className={`${td} pl-2 text-right`}>{reversed ? "Reversed" : "Posted"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}

      <div className="mt-16 flex justify-between gap-10 text-[8.5pt]">
        <div className="w-[60mm] border-t border-ink pt-1">Patient / payer signature</div>
        <div className="w-[60mm] border-t border-ink pt-1 text-right">Authorised signatory</div>
      </div>

      <footer className="mt-6 flex flex-col gap-1 text-[7.5pt] text-muted">
        <span>This is a bill, not a GST tax invoice.</span>
        <span className="flex justify-between gap-6">
          <span>Printed by {printedBy}, {printedAt}</span>
          <span>{invoice.hospital.name || "HMS"}</span>
        </span>
      </footer>
    </div>
  );
}
'@

Save-File 'src/features/billing/statement-sheet.tsx' @'
import { labelFor } from "@/features/patients/options";
import { showInstant } from "@/lib/format-instant";
import { HospitalBlock } from "./hospital-block";
import { fmt, type MoneyFormat } from "./money-format";
import { INVOICE_STATUS_OPTIONS } from "./options";
import type { Statement } from "./parse";

type Props = {
  statement: Statement;
  hospitalName: string;
  moneyFormat: MoneyFormat;
  timezone: string | null;
  asOf: string;
  printedBy: string;
};

const th = "py-1.5 font-headline text-[7.5pt] uppercase tracking-wider";
const td = "border-b border-[#e2e8f0] py-1.5 align-top";

function Info({ label, value }: { label: string; value: string }) {
  return value ? (
    <p>
      <span className="font-semibold">{label}:</span> {value}
    </p>
  ) : null;
}

/** The A4 paper version of a patient statement. Amounts are the server's. The statement carries no hospital address. */
export function StatementSheet({ statement, hospitalName, moneyFormat, timezone, asOf, printedBy }: Props) {
  const cellFormat: MoneyFormat = { ...moneyFormat, currency: undefined };
  const currency = statement.currency || moneyFormat.currency;

  return (
    <div className="text-[9pt] leading-snug text-ink">
      <HospitalBlock hospital={{ name: hospitalName }} />
      <hr className="my-3 border-ink" />

      <section className="grid grid-cols-2 gap-8">
        <div className="flex flex-col gap-0.5">
          <Info label="Patient MRN" value={statement.patientMrn} />
          <Info label="Name" value={statement.patientName} />
        </div>
        <div className="flex flex-col gap-0.5">
          <Info label="As of" value={asOf} />
        </div>
      </section>
      <hr className="my-3 border-ink" />

      <p className="text-center font-headline text-[11pt] font-bold uppercase tracking-widest">Statement of account</p>
      {currency ? <p className="mt-1 text-center text-[8pt] text-muted">All amounts in {currency}</p> : null}

      <table className="mt-5 w-full">
        <thead>
          <tr className="border-y border-ink">
            <th scope="col" className={`${th} pr-2 text-left`}>Invoice</th>
            <th scope="col" className={`${th} pr-2 text-left`}>Date</th>
            <th scope="col" className={`${th} pl-2 text-right`}>Total</th>
            <th scope="col" className={`${th} pl-2 text-right`}>Paid</th>
            <th scope="col" className={`${th} pl-2 text-right`}>Balance</th>
            <th scope="col" className={`${th} pl-2 text-right`}>Status</th>
          </tr>
        </thead>
        <tbody>
          {statement.invoices.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-3 text-muted">No issued invoices.</td>
            </tr>
          ) : (
            statement.invoices.map((invoice, index) => (
              <tr key={invoice.id || index}>
                <td className={`${td} pr-2 font-semibold`}>{invoice.number || "\u2014"}</td>
                <td className={`${td} pr-2`}>{showInstant(invoice.date, timezone) || "\u2014"}</td>
                <td className={`${td} pl-2 text-right tabular-nums`}>{fmt(invoice.total, cellFormat)}</td>
                <td className={`${td} pl-2 text-right tabular-nums`}>{fmt(invoice.paid, cellFormat)}</td>
                <td className={`${td} pl-2 text-right font-semibold tabular-nums`}>{fmt(invoice.balance, cellFormat)}</td>
                <td className={`${td} pl-2 text-right`}>{labelFor(INVOICE_STATUS_OPTIONS, invoice.status)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="mt-5 flex justify-end">
        <div className="flex w-[80mm] justify-between border-t border-ink pt-1.5 text-[10.5pt] font-bold">
          <span>Outstanding</span>
          <span className="tabular-nums">{fmt(statement.outstanding, moneyFormat)}</span>
        </div>
      </div>

      <div className="mt-16 flex justify-end text-[8.5pt]">
        <div className="w-[60mm] border-t border-ink pt-1 text-right">Authorised signatory</div>
      </div>

      <footer className="mt-6 flex justify-between gap-6 text-[7.5pt] text-muted">
        <span>Printed by {printedBy}, {asOf}</span>
        <span>{hospitalName || "HMS"}</span>
      </footer>
    </div>
  );
}
'@

Save-File 'src/features/billing/server.ts' @'
import "server-only";
import type { Option } from "@/components/ui/select-field";
import { apiLoad } from "@/lib/api/load";
import type { ClientError } from "@/lib/api/errors";
import { getHospital } from "@/lib/hospital";
import { fmt, type MoneyFormat } from "./money-format";
import { parseServices } from "./parse";

/** Currency comes from /identity/me, so every user (receptionist and accountant too) gets it. */
export async function loadMoneyFormat(): Promise<MoneyFormat> {
  const hospital = await getHospital();
  const currency = hospital?.currencyCode || undefined;
  return { currency, grouping: currency === "INR" ? "indian" : "international" };
}

/** Active services for the line picker: "CODE - Name (price)". Needs billing.service.view. */
export async function loadServiceOptions(format: MoneyFormat): Promise<{ options: Option[]; error: ClientError | null }> {
  const result = await apiLoad<unknown>("/billing/services", { query: { active: true, per_page: 200 } });
  if (!result.ok) return { options: [], error: result.error };
  const options = parseServices(result.data).items.map((service) => ({
    value: service.id,
    label: `${service.code} \u2014 ${service.name} (${fmt(service.unitPrice, format)})`,
  }));
  return { options, error: null };
}
'@

Save-File 'src/features/billing/filters.ts' @'
import { parseIso } from "@/lib/calendar";
import { readPage } from "@/lib/page-param";

export type InvoiceFilters = { date: string; status: string; page: number };

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/** The day is optional: without it the newest invoices of any day are listed. The day means when it was CREATED. */
export function readInvoiceFilters(raw: Record<string, string | string[] | undefined>, allowedStatuses: readonly string[]): InvoiceFilters {
  const date = first(raw.date);
  const status = first(raw.status);
  return {
    date: parseIso(date) ? date : "",
    status: allowedStatuses.includes(status) ? status : "",
    page: readPage(raw.page),
  };
}
'@

Save-File 'src/features/billing/filters.test.ts' @'
import { describe, expect, it } from "vitest";
import { readInvoiceFilters } from "./filters";

const statuses = ["draft", "issued"];

describe("readInvoiceFilters", () => {
  it("has no day by default (newest invoices) and drops invalid values", () => {
    expect(readInvoiceFilters({}, statuses)).toEqual({ date: "", status: "", page: 1 });
    expect(readInvoiceFilters({ date: "nope", status: "x", page: "0" }, statuses)).toEqual({ date: "", status: "", page: 1 });
  });
  it("keeps valid values", () => {
    expect(readInvoiceFilters({ date: "2026-10-19", status: "draft", page: "3" }, statuses)).toEqual({ date: "2026-10-19", status: "draft", page: 3 });
  });
});
'@

Save-File 'src/features/billing/invoice-filters.tsx' @'
"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { useNavigationProgress } from "@/components/ui/navigation-progress";
import { SelectField } from "@/components/ui/select-field";
import { parseIso } from "@/lib/calendar";
import { INVOICE_STATUS_OPTIONS } from "./options";

/** The day is optional (empty = newest invoices). Neither value is patient data, so both live in the URL. */
export function InvoiceFilters({ date, status }: { date: string; status: string }) {
  const router = useRouter();
  const progress = useNavigationProgress();
  const [pending, startTransition] = useTransition();

  function go(next: Partial<{ date: string; status: string }>) {
    const params = new URLSearchParams();
    const nextDate = next.date ?? date;
    const nextStatus = next.status ?? status;
    if (nextDate) params.set("date", nextDate);
    if (nextStatus) params.set("status", nextStatus);
    progress.start();
    startTransition(() => router.push(`/billing${params.size > 0 ? `?${params.toString()}` : ""}`));
  }

  return (
    <div
      aria-busy={pending || undefined}
      className={clsx("mb-6 grid grid-cols-1 items-end gap-5 border border-ink bg-surface p-6 transition-opacity md:grid-cols-12", pending && "opacity-60")}
    >
      <div className="md:col-span-4">
        <DateField
          key={date}
          label="Created on"
          value={date}
          onChange={(value) => {
            if (value === "") {
              if (date) go({ date: "" });
            } else if (parseIso(value) && value !== date) {
              go({ date: value });
            }
          }}
          minYear={2020}
          hint="Leave empty for the newest invoices."
        />
      </div>
      <div className="md:col-span-4">
        <SelectField label="Status" options={INVOICE_STATUS_OPTIONS} value={status} onChange={(value) => go({ status: value })} allowEmpty emptyLabel="All statuses" placeholder="All statuses" />
      </div>
      <div className="md:col-span-2">
        <Button variant="secondary" className="w-full" disabled={!date && !status} onClick={() => go({ date: "", status: "" })}>
          Clear
        </Button>
      </div>
    </div>
  );
}
'@

Save-File 'src/app/(app)/billing/page.tsx' @'
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { NoAccess } from "@/components/ui/no-access";
import { ErrorNotice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { UrlPagination } from "@/components/ui/url-pagination";
import { readInvoiceFilters } from "@/features/billing/filters";
import { InvoiceFilters } from "@/features/billing/invoice-filters";
import { fmt } from "@/features/billing/money-format";
import { INVOICE_STATUS_OPTIONS, invoiceTone } from "@/features/billing/options";
import { parseInvoiceList } from "@/features/billing/parse";
import { loadMoneyFormat } from "@/features/billing/server";
import { labelFor } from "@/features/patients/options";
import { apiLoad } from "@/lib/api/load";
import { requireSession } from "@/lib/auth/session";
import { formatLocalDate } from "@/lib/datetime";
import { showInstant } from "@/lib/format-instant";
import { hospitalNow } from "@/lib/hospital";
import { can } from "@/lib/permissions";

const PAGE_SIZE = 20;

export default async function BillingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireSession();
  const p = session.permissions;
  if (!can(p, "billing.invoice.view")) {
    if (can(p, "billing.service.view")) redirect("/billing/services");
    if (can(p, "billing.statement.view")) redirect("/billing/statement");
    return <NoAccess />;
  }

  const [now, moneyFormat] = await Promise.all([hospitalNow(), loadMoneyFormat()]);
  const filters = readInvoiceFilters(await searchParams, INVOICE_STATUS_OPTIONS.map((o) => o.value));
  const result = await apiLoad<unknown>("/billing/invoices", {
    query: { date: filters.date, status: filters.status, per_page: PAGE_SIZE, page: filters.page },
  });
  const list = result.ok ? parseInvoiceList(result.data) : null;

  return (
    <>
      <PageHeader
        title="Invoices"
        description={filters.date ? `Created on ${formatLocalDate(filters.date)}` : "The newest invoices, newest first"}
        actions={can(p, "billing.invoice.create") ? <LinkButton href="/billing/new">New invoice</LinkButton> : undefined}
      />
      <InvoiceFilters date={filters.date} status={filters.status} />

      {!result.ok ? (
        <ErrorNotice error={result.error} />
      ) : list && list.items.length === 0 ? (
        <EmptyState title="No invoices" description="Nothing matches these filters. Change them, or create a new invoice." />
      ) : list ? (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto border border-ink bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink font-headline text-xs uppercase tracking-wider">
                <tr>
                  <th scope="col" className="p-3">Invoice</th>
                  <th scope="col" className="p-3">Patient</th>
                  <th scope="col" className="p-3">Created</th>
                  <th scope="col" className="p-3 text-right">Total</th>
                  <th scope="col" className="p-3 text-right">Balance</th>
                  <th scope="col" className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-accent last:border-b-0 hover:bg-section-soft">
                    <td className="p-3">
                      {/* prefetch off: opening an invoice is an audited read. */}
                      <Link href={`/billing/${invoice.id}`} prefetch={false} className="font-medium underline">
                        {invoice.number || (invoice.status === "draft" ? "Draft" : "\u2014")}
                      </Link>
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{invoice.patientName || "\u2014"}</p>
                      <p className="text-xs text-muted">MRN {invoice.patientMrn || "\u2014"}</p>
                    </td>
                    <td className="p-3 text-muted">{showInstant(invoice.date, now.timezone) || "\u2014"}</td>
                    <td className="p-3 text-right font-medium">{fmt(invoice.total, moneyFormat)}</td>
                    <td className="p-3 text-right">{fmt(invoice.balance, moneyFormat)}</td>
                    <td className="p-3">
                      <StatusBadge label={labelFor(INVOICE_STATUS_OPTIONS, invoice.status)} tone={invoiceTone(invoice.status)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <UrlPagination page={list.currentPage} lastPage={list.lastPage} total={list.total} pageSize={PAGE_SIZE} />
        </div>
      ) : null}
    </>
  );
}
'@

Save-File 'src/app/(app)/billing/[id]/page.tsx' @'
import { notFound } from "next/navigation";
import { LinkButton } from "@/components/ui/link-button";
import { NoAccess } from "@/components/ui/no-access";
import { ErrorNotice, Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { PrintButton } from "@/components/ui/print-button";
import { Section } from "@/components/ui/section";
import { StatusBadge } from "@/components/ui/status-badge";
import { CancelInvoice } from "@/features/billing/cancel-invoice";
import { DraftTools } from "@/features/billing/draft-tools";
import { InvoiceSheet } from "@/features/billing/invoice-sheet";
import { linesToDrafts } from "@/features/billing/lines";
import { fmt, isZeroMoney } from "@/features/billing/money-format";
import { INVOICE_STATUS_OPTIONS, invoiceTone } from "@/features/billing/options";
import { parseInvoice } from "@/features/billing/parse";
import { PaymentForm } from "@/features/billing/payment-form";
import { PaymentsList } from "@/features/billing/payments-list";
import { loadMoneyFormat, loadServiceOptions } from "@/features/billing/server";
import { labelFor } from "@/features/patients/options";
import { apiLoad } from "@/lib/api/load";
import { requireSession } from "@/lib/auth/session";
import { formatLocalDate } from "@/lib/datetime";
import { hospitalNow } from "@/lib/hospital";
import { can } from "@/lib/permissions";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  if (!/^[0-9a-z]{26}$/i.test(id)) notFound();
  const p = session.permissions;
  if (!can(p, "billing.invoice.view")) return <NoAccess />;

  const [result, now, moneyFormat] = await Promise.all([apiLoad<unknown>(`/billing/invoices/${id}`), hospitalNow(), loadMoneyFormat()]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    if (result.error.status === 403) return <NoAccess />;
    return <ErrorNotice error={result.error} />;
  }

  const invoice = parseInvoice(result.data);
  const draft = invoice.status === "draft";
  const payable = (invoice.status === "issued" || invoice.status === "partially_paid") && invoice.balance !== "" && !isZeroMoney(invoice.balance);
  const services = draft && can(p, "billing.invoice.create") && can(p, "billing.service.view") ? await loadServiceOptions(moneyFormat) : { options: [], error: null };

  // The title follows the STATUS: only a draft has no number.
  const screenTitle = invoice.number || (draft ? "Draft invoice" : "Invoice");

  const totals = [
    { label: "Subtotal", value: invoice.subtotal },
    { label: "Discount", value: invoice.discountTotal },
    { label: "Tax", value: invoice.taxTotal },
    { label: "Total", value: invoice.total, strong: true },
    { label: "Paid", value: invoice.paid },
    { label: "Balance", value: invoice.balance, strong: true },
  ].filter((row) => row.value !== "");

  return (
    <>
      {/* The screen version. It does not print: the A4 sheet below does. */}
      <div className="print:hidden">
        <PageHeader
          title={screenTitle}
          description={[invoice.patientName, invoice.patientMrn ? `MRN ${invoice.patientMrn}` : ""].filter(Boolean).join(" \u00b7 ")}
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge label={labelFor(INVOICE_STATUS_OPTIONS, invoice.status)} tone={invoiceTone(invoice.status)} />
              <PrintButton />
              {invoice.patientId && can(p, "billing.statement.view") ? (
                <LinkButton href={`/billing/statement/${invoice.patientId}`} variant="secondary">Patient statement</LinkButton>
              ) : null}
              <LinkButton href="/billing" variant="secondary">All invoices</LinkButton>
            </div>
          }
        />

        <div className="flex flex-col gap-10">
          {invoice.status === "cancelled" ? <Notice>This invoice is cancelled. It stays on record with its number.</Notice> : null}
          {services.error ? <ErrorNotice error={services.error} /> : null}

          <Section title="Lines">
            {invoice.lines.length === 0 ? (
              <p className="text-sm text-muted">No lines yet.</p>
            ) : (
              <div className="overflow-x-auto border border-ink bg-surface">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-ink font-headline text-xs uppercase tracking-wider">
                    <tr>
                      <th scope="col" className="p-3">Item</th>
                      <th scope="col" className="p-3 text-right">Qty</th>
                      <th scope="col" className="p-3 text-right">Unit price</th>
                      <th scope="col" className="p-3 text-right">Discount</th>
                      <th scope="col" className="p-3 text-right">Tax %</th>
                      <th scope="col" className="p-3 text-right">Line total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lines.map((line, index) => (
                      <tr key={index} className="border-b border-accent last:border-b-0">
                        <td className="p-3">{line.description || "\u2014"}</td>
                        <td className="p-3 text-right">{line.quantity || "\u2014"}</td>
                        <td className="p-3 text-right">{fmt(line.unitPrice, moneyFormat)}</td>
                        <td className="p-3 text-right">{line.discount && !isZeroMoney(line.discount) ? fmt(line.discount, moneyFormat) : "\u2014"}</td>
                        <td className="p-3 text-right">{line.taxPercent && !isZeroMoney(line.taxPercent) ? line.taxPercent : "\u2014"}</td>
                        <td className="p-3 text-right font-medium">{fmt(line.total, moneyFormat)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totals.length > 0 ? (
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {totals.map((row) => (
                  <div key={row.label} className="border border-ink bg-surface p-3">
                    <dt className="font-headline text-xs font-semibold uppercase tracking-wider text-muted">{row.label}</dt>
                    <dd className={row.strong ? "mt-1 font-headline text-lg font-bold text-ink" : "mt-1 text-sm text-ink"}>{fmt(row.value, moneyFormat)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <p className="mt-2 text-xs text-muted">All amounts are calculated by the server.</p>
          </Section>

          {draft ? (
            <Section title="Draft">
              <DraftTools
                invoiceId={id}
                initialLines={linesToDrafts(invoice.lines)}
                services={services.options}
                canEdit={can(p, "billing.invoice.create")}
                canIssue={can(p, "billing.invoice.issue")}
                canDiscount={can(p, "billing.discount.apply")}
                canCustom={can(p, "billing.service.manage")}
              />
            </Section>
          ) : null}

          {!draft ? (
            <Section title="Payments">
              <div className="flex flex-col gap-6">
                <PaymentsList payments={invoice.payments} canReverse={can(p, "billing.payment.reverse")} moneyFormat={moneyFormat} timezone={now.timezone} />
                {payable && can(p, "billing.payment.record") ? (
                  <PaymentForm invoiceId={id} balance={invoice.balance} moneyFormat={moneyFormat} />
                ) : null}
              </div>
            </Section>
          ) : null}

          {invoice.status === "issued" && can(p, "billing.invoice.cancel") ? (
            <Section title="Cancel">
              <div className="flex flex-wrap items-center justify-between gap-4 border border-ink bg-surface p-6">
                <p className="max-w-xl text-sm text-muted">An issued invoice is never deleted. It can be cancelled with a reason, only while it has no active payment.</p>
                <CancelInvoice invoiceId={id} />
              </div>
            </Section>
          ) : null}
        </div>
      </div>

      {/* The paper version (A4). Only this prints. */}
      <div className="hidden print:block">
        <InvoiceSheet
          invoice={invoice}
          moneyFormat={moneyFormat}
          timezone={now.timezone}
          printedBy={session.name}
          printedAt={`${formatLocalDate(now.today)}, ${now.time}`}
        />
      </div>
    </>
  );
}
'@

Save-File 'src/app/(app)/billing/statement/[patientId]/page.tsx' @'
import Link from "next/link";
import { notFound } from "next/navigation";
import { LinkButton } from "@/components/ui/link-button";
import { NoAccess } from "@/components/ui/no-access";
import { ErrorNotice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { PrintButton } from "@/components/ui/print-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { fmt } from "@/features/billing/money-format";
import { INVOICE_STATUS_OPTIONS, invoiceTone } from "@/features/billing/options";
import { parseStatement } from "@/features/billing/parse";
import { loadMoneyFormat } from "@/features/billing/server";
import { StatementSheet } from "@/features/billing/statement-sheet";
import { labelFor } from "@/features/patients/options";
import { apiLoad } from "@/lib/api/load";
import { requireSession } from "@/lib/auth/session";
import { formatLocalDate } from "@/lib/datetime";
import { showInstant } from "@/lib/format-instant";
import { getHospital, hospitalNow } from "@/lib/hospital";
import { can } from "@/lib/permissions";

export default async function StatementPage({ params }: { params: Promise<{ patientId: string }> }) {
  const session = await requireSession();
  const { patientId } = await params;
  if (!/^[0-9a-z]{26}$/i.test(patientId)) notFound();
  if (!can(session.permissions, "billing.statement.view")) return <NoAccess />;

  const [result, now, moneyFormat, hospital] = await Promise.all([
    apiLoad<unknown>(`/billing/patients/${patientId}/statement`),
    hospitalNow(),
    loadMoneyFormat(),
    getHospital(),
  ]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    if (result.error.status === 403) return <NoAccess />;
    return <ErrorNotice error={result.error} />;
  }

  const statement = parseStatement(result.data);

  return (
    <>
      {/* The screen version. It does not print: the A4 sheet below does. */}
      <div className="print:hidden">
        <PageHeader
          title={statement.patientName || "Patient statement"}
          description={statement.patientMrn ? `MRN ${statement.patientMrn}` : undefined}
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <PrintButton />
              <LinkButton href="/billing/statement" variant="secondary">Another patient</LinkButton>
            </div>
          }
        />

        <div className="mb-8 border border-ink bg-surface p-6">
          <p className="font-headline text-xs font-semibold uppercase tracking-wider text-muted">Outstanding</p>
          <p className="mt-3 whitespace-nowrap font-headline text-4xl font-bold leading-none tracking-tight text-ink">{fmt(statement.outstanding, moneyFormat)}</p>
          <p className="mt-3 text-xs text-muted">Worked out by the server from the issued invoices below.</p>
        </div>

        {statement.invoices.length === 0 ? (
          <p className="text-sm text-muted">No issued invoices.</p>
        ) : (
          <div className="overflow-x-auto border border-ink bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink font-headline text-xs uppercase tracking-wider">
                <tr>
                  <th scope="col" className="p-3">Invoice</th>
                  <th scope="col" className="p-3">Issued</th>
                  <th scope="col" className="p-3 text-right">Total</th>
                  <th scope="col" className="p-3 text-right">Paid</th>
                  <th scope="col" className="p-3 text-right">Balance</th>
                  <th scope="col" className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {statement.invoices.map((invoice, index) => (
                  <tr key={invoice.id || index} className="border-b border-accent last:border-b-0 hover:bg-section-soft">
                    <td className="p-3">
                      {invoice.id && can(session.permissions, "billing.invoice.view") ? (
                        <Link href={`/billing/${invoice.id}`} prefetch={false} className="font-medium underline">{invoice.number || "\u2014"}</Link>
                      ) : (
                        <span className="font-medium">{invoice.number || "\u2014"}</span>
                      )}
                    </td>
                    <td className="p-3 text-muted">{showInstant(invoice.date, now.timezone) || "\u2014"}</td>
                    <td className="p-3 text-right">{fmt(invoice.total, moneyFormat)}</td>
                    <td className="p-3 text-right">{fmt(invoice.paid, moneyFormat)}</td>
                    <td className="p-3 text-right font-medium">{fmt(invoice.balance, moneyFormat)}</td>
                    <td className="p-3">
                      <StatusBadge label={labelFor(INVOICE_STATUS_OPTIONS, invoice.status)} tone={invoiceTone(invoice.status)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* The paper version (A4). Only this prints. */}
      <div className="hidden print:block">
        <StatementSheet
          statement={statement}
          hospitalName={hospital?.name || "HMS"}
          moneyFormat={moneyFormat}
          timezone={now.timezone}
          asOf={`${formatLocalDate(now.today)}, ${now.time}`}
          printedBy={session.name}
        />
      </div>
    </>
  );
}
'@

# ================================================================ dashboard (real data)

Save-File 'src/features/dashboard/parse.ts' @'
import { list, num, rec, str } from "@/lib/utils/guards";
import { nameOf } from "@/lib/utils/names";

export type StatusCount = { status: string; count: number };
export type DayCount = { date: string; count: number };
export type DayAmount = { date: string; amount: string };
export type MethodAmount = { method: string; amount: string; share: number | null };

export type Dashboard = {
  date: string;
  timezone: string;
  currency: string;
  patients: { registeredToday: number } | null;
  appointments: { total: number; byStatus: StatusCount[]; byPractitioner: { name: string; count: number }[]; last7: DayCount[] } | null;
  queue: { waiting: number; inConsultation: number; completed: number; skipped: number } | null;
  clinical: { opened: number; finished: number; openNow: number } | null;
  billing: { invoicesToday: StatusCount[]; collectedToday: string; byMethod: MethodAmount[]; last7: DayAmount[]; outstanding: string } | null;
};

const STATUS_ORDER = ["booked", "checked_in", "in_consultation", "completed", "cancelled", "no_show"];
const INVOICE_ORDER = ["draft", "issued", "partially_paid", "paid", "cancelled"];

/** A section is only there when the user also holds the permission of its data. */
function section(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function counts(value: unknown, order: string[]): StatusCount[] {
  const o = rec(value);
  const keys = [...order.filter((key) => key in o), ...Object.keys(o).filter((key) => !order.includes(key))];
  return keys.map((status) => ({ status, count: num(o[status]) ?? 0 }));
}

/** Money is text with two decimals. A number is shown with two decimals but never calculated with. */
function money(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value.toFixed(2);
  return "";
}

export function parseDashboard(body: unknown): Dashboard {
  const d = rec(rec(body).data);
  const patients = section(d.patients);
  const appointments = section(d.appointments);
  const queue = section(d.queue);
  const clinical = section(d.clinical);
  const billing = section(d.billing);

  return {
    date: str(d.date),
    timezone: str(d.timezone),
    currency: str(d.currency),
    patients: patients ? { registeredToday: num(patients.registered_today) ?? 0 } : null,
    appointments: appointments
      ? {
          total: num(appointments.today_total) ?? 0,
          byStatus: counts(appointments.by_status, STATUS_ORDER),
          byPractitioner: list(appointments.by_practitioner).map((raw) => ({
            name: nameOf(rec(raw).practitioner),
            count: num(rec(raw).count) ?? 0,
          })),
          last7: list(appointments.last_7_days).map((raw) => ({ date: str(rec(raw).date), count: num(rec(raw).count) ?? 0 })),
        }
      : null,
    queue: queue
      ? {
          waiting: num(queue.waiting) ?? 0,
          inConsultation: num(queue.in_consultation) ?? 0,
          completed: num(queue.completed) ?? 0,
          skipped: num(queue.skipped) ?? 0,
        }
      : null,
    clinical: clinical
      ? {
          opened: num(clinical.encounters_opened_today) ?? 0,
          finished: num(clinical.encounters_finished_today) ?? 0,
          openNow: num(clinical.open_now) ?? 0,
        }
      : null,
    billing: billing
      ? {
          invoicesToday: counts(billing.invoices_today, INVOICE_ORDER),
          collectedToday: money(billing.collected_today),
          byMethod: Object.entries(rec(billing.collected_by_method_today)).map(([method, raw]) => {
            const o = typeof raw === "object" && raw !== null ? rec(raw) : null;
            return { method, amount: o ? money(o.amount ?? o.total) : money(raw), share: o ? (num(o.share) ?? num(o.percent)) : null };
          }),
          last7: list(billing.collected_last_7_days).map((raw) => ({ date: str(rec(raw).date), amount: money(rec(raw).amount) })),
          outstanding: money(billing.outstanding_total),
        }
      : null,
  };
}
'@

Save-File 'src/features/dashboard/parse.test.ts' @'
import { describe, expect, it } from "vitest";
import { parseDashboard } from "./parse";

const body = {
  data: {
    date: "2026-10-19",
    timezone: "Asia/Kolkata",
    currency: "INR",
    patients: { registered_today: 3 },
    appointments: {
      today_total: 5,
      by_status: { booked: 2, weird: 1, completed: 3 },
      by_practitioner: [{ practitioner: { id: "d1", full_name: "Dr Khan" }, count: 4 }],
      last_7_days: [{ date: "2026-10-18", count: 2 }],
    },
    queue: { waiting: 1, in_consultation: 1, completed: 2, skipped: 0 },
    billing: {
      invoices_today: { issued: 2, draft: 1 },
      collected_today: "500.00",
      collected_by_method_today: { cash: "300.00", upi: { amount: "200.00", share: 40 } },
      collected_last_7_days: [{ date: "2026-10-18", amount: "100.00" }],
      outstanding_total: "900.00",
    },
  },
};

describe("parseDashboard", () => {
  it("reads the real summary and keeps money as text", () => {
    const d = parseDashboard(body);
    expect(d).toMatchObject({ date: "2026-10-19", timezone: "Asia/Kolkata", currency: "INR" });
    expect(d.patients).toEqual({ registeredToday: 3 });
    expect(d.appointments?.byStatus.map((s) => s.status)).toEqual(["booked", "completed", "weird"]);
    expect(d.appointments?.byPractitioner).toEqual([{ name: "Dr Khan", count: 4 }]);
    expect(d.queue).toEqual({ waiting: 1, inConsultation: 1, completed: 2, skipped: 0 });
    expect(d.billing?.collectedToday).toBe("500.00");
    expect(d.billing?.outstanding).toBe("900.00");
    expect(d.billing?.invoicesToday.map((s) => s.status)).toEqual(["draft", "issued"]);
    expect(d.billing?.byMethod).toEqual([
      { method: "cash", amount: "300.00", share: null },
      { method: "upi", amount: "200.00", share: 40 },
    ]);
  });
  it("leaves out a section the server did not send", () => {
    expect(parseDashboard(body).clinical).toBeNull();
    const none = parseDashboard(null);
    expect(none.appointments).toBeNull();
    expect(none.billing).toBeNull();
  });
});
'@

Save-File 'src/features/dashboard/server.ts' @'
import "server-only";
import { apiLoad, type LoadResult } from "@/lib/api/load";
import { parseDashboard, type Dashboard } from "./parse";

/** GET /dashboard/summary: counts and totals only, no patient data. Loaded once per visit, never polled. */
export async function loadDashboard(): Promise<LoadResult<Dashboard>> {
  const result = await apiLoad<unknown>("/dashboard/summary");
  return result.ok ? { ok: true, data: parseDashboard(result.data) } : result;
}
'@

Save-File 'src/app/(app)/page.tsx' @'
import { ErrorNotice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { APPOINTMENT_STATUS_OPTIONS } from "@/features/appointments/options";
import { INVOICE_STATUS_OPTIONS, PAYMENT_METHOD_OPTIONS } from "@/features/billing/options";
import { loadDashboard } from "@/features/dashboard/server";
import { QuickActions } from "@/features/dashboard/quick-actions";
import { BarList, ColumnChart, KpiCard, Panel, type Tone } from "@/features/dashboard/widgets";
import { labelFor } from "@/features/patients/options";
import { requireSession } from "@/lib/auth/session";
import { weekdayName } from "@/lib/calendar";
import { formatLocalDate } from "@/lib/datetime";
import { getHospital, hospitalNow } from "@/lib/hospital";
import { formatMoney } from "@/lib/money";
import { can } from "@/lib/permissions";

function greeting(time: string): string {
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// The same status has the same colour everywhere on this screen. The label always says what it is.
const STATUS_TONES: Record<string, Tone> = {
  booked: "sky",
  checked_in: "teal",
  in_consultation: "violet",
  completed: "emerald",
  cancelled: "red",
  no_show: "amber",
};
const METHOD_TONES: Record<string, Tone> = { cash: "emerald", upi: "violet", card: "sky" };
const DOCTOR_TONES: Tone[] = ["teal", "sky", "violet", "pink", "amber"];

function CountBoxes({ items }: { items: { label: string; value: number }[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <li key={item.label} className="border border-ink bg-section-soft p-3">
          <p className="font-headline text-2xl font-bold text-ink">{item.value}</p>
          <p className="text-xs text-muted">{item.label}</p>
        </li>
      ))}
    </ul>
  );
}

export default async function DashboardPage() {
  const session = await requireSession();
  const [now, hospital] = await Promise.all([hospitalNow(), getHospital()]);

  const result = can(session.permissions, "dashboard.view") ? await loadDashboard() : null;
  const data = result && result.ok ? result.data : null;

  const currency = data?.currency || hospital?.currencyCode || undefined;
  const grouping = currency === "INR" ? "indian" : "international";
  const money = (amount: string) => (amount ? formatMoney(amount, { currency, grouping }) : "\u2014");
  const firstName = session.name.split(" ")[0] || session.name;
  const today = data?.date || now.today;

  const a = data?.appointments ?? null;
  const q = data?.queue ?? null;
  const c = data?.clinical ?? null;
  const b = data?.billing ?? null;
  const p = data?.patients ?? null;

  const kpis: { label: string; value: string; caption: string; tone: Tone }[] = [];
  if (a) kpis.push({ label: "Appointments today", value: String(a.total), caption: "Cancelled ones are not counted", tone: "sky" });
  if (q) kpis.push({ label: "In OPD queue", value: String(q.waiting + q.inConsultation), caption: "Waiting or with a doctor", tone: "violet" });
  if (a) kpis.push({ label: "Completed", value: String(a.byStatus.find((s) => s.status === "completed")?.count ?? 0), caption: "Appointments finished today", tone: "teal" });
  if (p) kpis.push({ label: "Registered today", value: String(p.registeredToday), caption: "New patients", tone: "pink" });
  if (c) kpis.push({ label: "Open encounters", value: String(c.openNow), caption: "Consultations in progress", tone: "violet" });
  if (b) kpis.push({ label: "Collected today", value: money(b.collectedToday), caption: "Payments recorded today", tone: "amber" });
  if (b) kpis.push({ label: "Outstanding", value: money(b.outstanding), caption: "Unpaid on issued invoices", tone: "red" });

  const allShares = b !== null && b.byMethod.length > 0 && b.byMethod.every((row) => row.share !== null);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`${greeting(now.time)}, ${firstName}`}
        description={`${hospital?.name || "HMS"} \u00b7 ${weekdayName(now.today)}, ${formatLocalDate(now.today)}`}
      />

      <QuickActions permissions={session.permissions} />

      {result && !result.ok ? <ErrorNotice error={result.error} /> : null}

      {kpis.length > 0 ? (
        <section aria-label="Today at a glance">
          <h2 className="mb-3 font-headline text-xs font-semibold uppercase tracking-wider text-muted">Today at a glance</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => (
              <KpiCard key={kpi.label} tone={kpi.tone} label={kpi.label} value={kpi.value} caption={kpi.caption} />
            ))}
          </div>
        </section>
      ) : null}

      {data ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {a && a.last7.length > 0 ? (
            <Panel title="Appointments, last 7 days" tone="sky" className="lg:col-span-8">
              <ColumnChart
                columns={a.last7.map((day, index, all) => ({
                  label: weekdayName(day.date).slice(0, 3),
                  value: day.count,
                  highlight: index === all.length - 1,
                }))}
              />
            </Panel>
          ) : null}
          {a ? (
            <Panel title="Today by status" tone="violet" className="lg:col-span-4">
              <BarList
                rows={a.byStatus.map((row) => ({
                  label: labelFor(APPOINTMENT_STATUS_OPTIONS, row.status),
                  value: row.count,
                  tone: STATUS_TONES[row.status] ?? "ink",
                }))}
              />
            </Panel>
          ) : null}

          {q ? (
            <Panel title="OPD queue today" tone="violet" className="lg:col-span-6">
              <CountBoxes
                items={[
                  { label: "Waiting", value: q.waiting },
                  { label: "With a doctor", value: q.inConsultation },
                  { label: "Completed", value: q.completed },
                  { label: "Skipped", value: q.skipped },
                ]}
              />
            </Panel>
          ) : null}
          {c ? (
            <Panel title="Consultations today" tone="teal" className="lg:col-span-6">
              <CountBoxes
                items={[
                  { label: "Opened today", value: c.opened },
                  { label: "Finished today", value: c.finished },
                  { label: "Open now", value: c.openNow },
                ]}
              />
            </Panel>
          ) : null}

          {a && a.byPractitioner.length > 0 ? (
            <Panel title="Doctor load today" tone="pink" className="lg:col-span-6">
              <BarList rows={a.byPractitioner.map((row, index) => ({ label: row.name || "\u2014", value: row.count, tone: DOCTOR_TONES[index % DOCTOR_TONES.length] }))} />
            </Panel>
          ) : null}

          {b ? (
            <Panel title="Collection by method" tone="amber" className="lg:col-span-6">
              {b.byMethod.length === 0 ? (
                <p className="text-sm text-muted">Nothing collected today.</p>
              ) : allShares ? (
                <BarList
                  rows={b.byMethod.map((row) => ({
                    label: labelFor(PAYMENT_METHOD_OPTIONS, row.method),
                    value: row.share ?? 0,
                    display: money(row.amount),
                    tone: METHOD_TONES[row.method] ?? "ink",
                  }))}
                />
              ) : (
                <ul>
                  {b.byMethod.map((row) => (
                    <li key={row.method} className="flex items-baseline justify-between gap-3 border-b border-accent py-2 text-sm first:pt-0 last:border-b-0 last:pb-0">
                      <span className="text-ink">{labelFor(PAYMENT_METHOD_OPTIONS, row.method)}</span>
                      <span className="font-headline font-bold text-ink">{money(row.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          ) : null}
          {b ? (
            <Panel title="Invoices today" tone="amber" className="lg:col-span-6">
              {b.invoicesToday.length === 0 ? (
                <p className="text-sm text-muted">No invoice was created today.</p>
              ) : (
                <CountBoxes items={b.invoicesToday.map((row) => ({ label: labelFor(INVOICE_STATUS_OPTIONS, row.status), value: row.count }))} />
              )}
            </Panel>
          ) : null}
          {b && b.last7.length > 0 ? (
            <Panel title="Collected, last 7 days" tone="amber" className="lg:col-span-6">
              <ul>
                {b.last7.map((day) => (
                  <li key={day.date} className="flex items-baseline justify-between gap-3 border-b border-accent py-2 text-sm first:pt-0 last:border-b-0 last:pb-0">
                    <span className={day.date === today ? "font-semibold text-ink" : "text-muted"}>{weekdayName(day.date)}, {formatLocalDate(day.date)}</span>
                    <span className="font-headline font-bold text-ink">{money(day.amount)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
'@

Remove-File 'src/features/dashboard/data.ts'
Remove-File 'src/features/dashboard/types.ts'

# ================================================================ patients (recent list, real fields)

Save-File 'src/features/patients/parse.ts' @'
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
  phone: string; // shown exactly as the API returns it (a list gives the masked number)
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
    // The detail has "phone"; the list has only "phone_masked".
    phone: str(p.phone) || str(p.phone_masked),
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
      return { type: str(i.type) || str(i.id_type), value: str(i.value_masked) || str(i.value) };
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
'@

Save-File 'src/features/patients/patient-search.tsx' @'
"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorNotice } from "@/components/ui/notice";
import { Pagination } from "@/components/ui/pagination";
import { TextField } from "@/components/ui/text-field";
import type { ClientError } from "@/lib/api/errors";
import { formatLocalDate } from "@/lib/datetime";
import { applyFieldErrors } from "@/lib/forms";
import { PATIENTS_PAGE_SIZE } from "./limits";
import { SEX_OPTIONS, labelFor } from "./options";
import { searchPatientsAction } from "./actions";
import type { PatientSearchResult } from "./parse";
import { searchFormSchema, type SearchFormValues } from "./schemas";

/** "initial" is the newest registrations (GET /patients?recent=true), shown until the person searches. */
export function PatientSearch({ initial }: { initial: PatientSearchResult | null }) {
  const [criteria, setCriteria] = useState<SearchFormValues | null>(null);
  const [result, setResult] = useState<PatientSearchResult | null>(initial);
  const [showingRecent, setShowingRecent] = useState(initial !== null);
  const [formError, setFormError] = useState<ClientError | null>(null);
  const [paging, setPaging] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SearchFormValues>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: { name: "", phone: "", mrn: "", date_of_birth: "" },
  });

  // Criteria live in component state only: patient details must never appear in the URL.
  async function run(values: SearchFormValues, page: number) {
    setFormError(null);
    const response = await searchPatientsAction({ ...values, page });
    if (response.ok) {
      setCriteria(values);
      setResult(response.data);
      setShowingRecent(false);
      return;
    }
    if (response.error.code === "unauthenticated") {
      window.location.assign("/api/auth/session-expired");
      return;
    }
    if (!applyFieldErrors(response.error, setError, ["name", "phone", "mrn", "date_of_birth"])) setFormError(response.error);
  }

  const onSubmit = handleSubmit((values) => run(values, 1));

  async function goTo(page: number) {
    if (!criteria) return;
    setPaging(true);
    await run(criteria, page);
    setPaging(false);
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5 border border-ink bg-surface p-6">
        {formError ? <ErrorNotice error={formError} /> : null}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
          <div className="md:col-span-4">
            <TextField label="Name" autoComplete="off" hint="At least 2 characters." error={errors.name?.message} {...register("name")} />
          </div>
          <div className="md:col-span-3">
            <TextField label="Phone" autoComplete="off" hint="At least 7 digits." error={errors.phone?.message} {...register("phone")} />
          </div>
          <div className="md:col-span-2">
            <TextField label="MRN" autoComplete="off" error={errors.mrn?.message} {...register("mrn")} />
          </div>
          <div className="md:col-span-3">
            <Controller
              control={control}
              name="date_of_birth"
              render={({ field }) => (
                <DateField
                  label="Date of birth"
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.date_of_birth?.message}
                />
              )}
            />
          </div>
        </div>
        <div>
          <Button type="submit" loading={isSubmitting}>Search</Button>
        </div>
      </form>

      {result === null ? (
        <EmptyState
          title="Search to see patients"
          description="Enter a name, phone number or MRN above and press Search."
        />
      ) : result.items.length === 0 ? (
        <EmptyState
          title={showingRecent ? "No patient registered yet" : "No patient found"}
          description={showingRecent ? "Register the first patient, or search above." : "Check the spelling or try another detail."}
        />
      ) : (
        <div className="flex flex-col gap-4" aria-busy={paging || undefined}>
          {showingRecent ? (
            <p className="text-sm text-muted">
              Recently registered: the newest {result.items.length} {result.items.length === 1 ? "patient" : "patients"}. Search above to find anyone else.
            </p>
          ) : null}
          <div className={clsx("overflow-x-auto border border-ink bg-surface", paging && "opacity-60")}>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink font-headline text-xs uppercase tracking-wider">
                <tr>
                  <th scope="col" className="p-3">MRN</th>
                  <th scope="col" className="p-3">Name</th>
                  <th scope="col" className="p-3">Sex</th>
                  <th scope="col" className="p-3">Date of birth</th>
                  <th scope="col" className="p-3">Phone</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((patient) => (
                  <tr key={patient.id} className="border-b border-accent last:border-b-0 hover:bg-section-soft">
                    <td className="p-3">{patient.mrn || "\u2014"}</td>
                    <td className="p-3">
                      {/* prefetch off: opening a record is an audited read, so it must only happen on a click. */}
                      <Link href={`/patients/${patient.id}`} prefetch={false} className="font-medium underline">
                        {patient.displayName || "Unnamed patient"}
                      </Link>
                    </td>
                    <td className="p-3">{patient.sexAtBirth ? labelFor(SEX_OPTIONS, patient.sexAtBirth) : "\u2014"}</td>
                    <td className="p-3">{patient.dateOfBirth ? formatLocalDate(patient.dateOfBirth) : "\u2014"}</td>
                    <td className="p-3">{patient.phone || "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {showingRecent ? null : (
            <Pagination
              page={result.currentPage}
              lastPage={result.lastPage}
              total={result.total}
              pageSize={PATIENTS_PAGE_SIZE}
              disabled={paging}
              onPageChange={goTo}
            />
          )}
        </div>
      )}
    </div>
  );
}
'@

Save-File 'src/app/(app)/patients/page.tsx' @'
import { LinkButton } from "@/components/ui/link-button";
import { NoAccess } from "@/components/ui/no-access";
import { PageHeader } from "@/components/ui/page-header";
import { parsePatientList } from "@/features/patients/parse";
import { PatientSearch } from "@/features/patients/patient-search";
import { apiLoad } from "@/lib/api/load";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";

export default async function PatientsPage() {
  const session = await requireSession();
  if (!can(session.permissions, "patient.view")) return <NoAccess />;

  // The newest 50 registrations: needs only patient.view. It is audited (patient.recent_listed), so it is loaded once per visit.
  const recent = await apiLoad<unknown>("/patients", { query: { recent: true } });
  const initial = recent.ok ? parsePatientList(recent.data) : null;

  return (
    <>
      <PageHeader
        title="Patients"
        description="The newest registrations are listed below. Search by name, phone number or MRN to find anyone else."
        actions={can(session.permissions, "patient.register") ? <LinkButton href="/patients/new">Register patient</LinkButton> : undefined}
      />
      <PatientSearch initial={initial} />
    </>
  );
}
'@

# ================================================================ appointments (queue key, include_running, reschedule reason)

Save-File 'src/features/appointments/parse.ts' @'
import { localParts } from "@/lib/datetime";
import { parsePage, type PageInfo } from "@/lib/api/meta";
import { list, rec, str, strOrNull } from "@/lib/utils/guards";

export type AppointmentItem = {
  id: string;
  date: string;
  time: string;
  status: string;
  type: string;
  source: string;
  reason: string | null;
  patientName: string;
  patientMrn: string;
  practitionerId: string;
  practitionerName: string;
  token: string | null;
};

export type QueueItem = {
  id: string;
  token: string | null;
  status: string;
  patientName: string;
  patientMrn: string;
  practitionerName: string;
};

export type PractitionerOption = { id: string; name: string; specialization: string };
export type SlotDay = { date: string; times: string[] };

function nameOf(value: unknown): string {
  const o = rec(value);
  const full = str(o.full_name) || str(o.name) || str(o.display_name);
  if (full) return full;
  return [o.title, o.first_name, o.middle_name, o.last_name].map(str).filter(Boolean).join(" ");
}

/** Finds an OPD token number in an answer, whatever it is called. null when none is there. */
export function tokenOf(value: unknown): string | null {
  const o = rec(value);
  for (const key of ["token_number", "token", "opd_token", "queue_token", "queue_number", "number"]) {
    const found = o[key];
    if (typeof found === "number" && Number.isFinite(found)) return String(found);
    if (typeof found === "string" && found) return found;
    if (typeof found === "object" && found !== null) {
      const inner = tokenOf(found);
      if (inner) return inner;
    }
  }
  return null;
}

export function parseAppointment(raw: unknown, timezone: string | null): AppointmentItem {
  const a = rec(raw);
  const patient = rec(a.patient);
  const practitioner = rec(a.practitioner);

  let date = str(a.date);
  let time = str(a.time) || str(a.start_time);
  const instant = str(a.starts_at);
  if ((!date || !time) && timezone && instant) {
    const parts = localParts(new Date(instant), timezone);
    if (parts) {
      date = date || parts.date;
      time = time || parts.time;
    }
  }

  return {
    id: str(a.id),
    date,
    time: time.slice(0, 5),
    status: str(a.status),
    type: str(a.appointment_type) || str(a.type),
    source: str(a.source),
    reason: strOrNull(a.reason),
    patientName: nameOf(patient) || str(a.patient_name),
    patientMrn: str(patient.mrn) || str(a.patient_mrn) || str(a.mrn),
    practitionerId: str(a.practitioner_id) || str(practitioner.id),
    practitionerName: nameOf(practitioner) || str(a.practitioner_name),
    token: tokenOf(a),
  };
}

export function parseAppointmentList(body: unknown, timezone: string | null): { items: AppointmentItem[] } & PageInfo {
  const items = list(rec(body).data).map((item) => parseAppointment(item, timezone));
  return { items, ...parsePage(body, items.length) };
}

/** A queue token has no id of its own: it is told apart by the appointment it belongs to (or its number). */
export function parseQueue(body: unknown): QueueItem[] {
  return list(rec(body).data).map((raw) => {
    const q = rec(raw);
    const appointment = rec(q.appointment);
    const patient = rec(q.patient ?? appointment.patient);
    const practitioner = rec(q.practitioner ?? appointment.practitioner);
    const token = tokenOf(q);
    return {
      id: str(q.id) || str(q.appointment_id) || str(appointment.id) || (token ? `token-${token}` : ""),
      token,
      status: str(q.status),
      patientName: nameOf(patient) || str(q.patient_name),
      patientMrn: str(patient.mrn) || str(q.patient_mrn),
      practitionerName: nameOf(practitioner) || str(q.practitioner_name),
    };
  });
}

export function parsePractitioners(body: unknown): PractitionerOption[] {
  return list(rec(body).data)
    .map((raw) => {
      const p = rec(raw);
      const specializations = list(p.specializations).map((s) => str(rec(s).name) || str(s)).filter(Boolean);
      return { id: str(p.id), name: nameOf(p), specialization: specializations[0] ?? "" };
    })
    .filter((p) => p.id && p.name);
}

const TIME_RE = /^(\d{2}):(\d{2})/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T/;

function slotOf(value: unknown, fallbackDate: string, timezone: string | null): { date: string; time: string } | null {
  const o = rec(value);
  const text = typeof value === "string" ? value : str(o.time) || str(o.start_time) || str(o.start) || str(o.starts_at);
  const date = str(o.date) || fallbackDate;

  if (ISO_RE.test(text)) {
    const parts = timezone ? localParts(new Date(text), timezone) : null;
    if (parts) return parts;
    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(text);
    return m ? { date: m[1], time: `${m[2]}:${m[3]}` } : null;
  }
  const m = TIME_RE.exec(text);
  return m && date ? { date, time: `${m[1]}:${m[2]}` } : null;
}

/** Accepts a flat list of slots, a list of { date, slots: [...] }, or an object keyed by date. Returns days with sorted times. */
export function parseSlots(body: unknown, timezone: string | null): SlotDay[] {
  const data = rec(body).data;
  const found: { date: string; time: string }[] = [];
  const add = (value: unknown, date: string) => {
    const slot = slotOf(value, date, timezone);
    if (slot) found.push(slot);
  };

  if (Array.isArray(data)) {
    for (const item of data) {
      const o = rec(item);
      const nested = Array.isArray(o.slots) ? o.slots : Array.isArray(o.times) ? o.times : null;
      if (nested) nested.forEach((slot) => add(slot, str(o.date)));
      else add(item, "");
    }
  } else if (typeof data === "object" && data !== null) {
    for (const [key, value] of Object.entries(data)) {
      const nested = Array.isArray(value) ? value : list(rec(value).slots);
      nested.forEach((slot) => add(slot, key));
    }
  }

  const byDate = new Map<string, Set<string>>();
  for (const { date, time } of found) byDate.set(date, (byDate.get(date) ?? new Set()).add(time));
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, times]) => ({ date, times: [...times].sort() }));
}
'@

Save-File 'src/features/appointments/schemas.ts' @'
import { z } from "zod";
import { idSchema } from "@/features/patients/schemas";
import { daysBetween } from "@/lib/calendar";
import { MAX_SLOT_DAYS } from "./options";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.");
const hhmm = z.string().regex(/^\d{2}:\d{2}$/, "Choose a time.");

export const slotQuerySchema = z
  .object({
    practitioner_id: idSchema,
    from: isoDate,
    to: isoDate,
    timezone: z.string().max(64).optional(),
    /** A walk-in may use the slot that is running now. */
    include_running: z.boolean().optional(),
  })
  .refine(
    (v) => {
      const span = daysBetween(v.from, v.to);
      return span !== null && span >= 0 && span < MAX_SLOT_DAYS;
    },
    { path: ["to"], message: `Choose at most ${MAX_SLOT_DAYS} days.` },
  );

export const bookRequestSchema = z.object({
  patient_id: idSchema,
  practitioner_id: idSchema,
  date: isoDate,
  time: hhmm,
  appointment_type: z.enum(["consultation", "follow_up", "procedure"]),
  source: z.enum(["staff", "walk_in"]),
  reason: z.string().trim().max(150, "At most 150 characters."),
});

export const reasonSchema = z.object({
  reason: z.string().trim().min(1, "Enter a reason.").max(150, "At most 150 characters."),
});

/** The reason is optional and kept in the status history only. */
export const rescheduleSchema = z.object({
  date: isoDate,
  time: hhmm,
  reason: z.string().trim().max(100, "At most 100 characters.").optional(),
});
'@

Save-File 'src/features/appointments/actions.ts' @'
"use server";

import { apiFetch } from "@/lib/api/client";
import { fieldErrorsFromZod, invalidInput } from "@/lib/api/invalid";
import { failure, type ActionResult } from "@/lib/api/result";
import { idSchema } from "@/features/patients/schemas";
import { rec, str } from "@/lib/utils/guards";
import { parseSlots, tokenOf, type SlotDay } from "./parse";
import { bookRequestSchema, reasonSchema, rescheduleSchema, slotQuerySchema } from "./schemas";

export async function loadSlotsAction(input: unknown): Promise<ActionResult<SlotDay[]>> {
  const parsed = slotQuerySchema.safeParse(input);
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));

  try {
    const body = await apiFetch<unknown>("/appointment-slots", {
      query: {
        practitioner: parsed.data.practitioner_id,
        from: parsed.data.from,
        to: parsed.data.to,
        include_running: parsed.data.include_running ? true : undefined,
      },
      redirectOn401: false,
    });
    return { ok: true, data: parseSlots(body, parsed.data.timezone ?? null) };
  } catch (error) {
    return failure(error);
  }
}

export async function bookAppointmentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = bookRequestSchema.safeParse(input);
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));

  const { reason, ...rest } = parsed.data;
  try {
    const body = await apiFetch<unknown>("/appointments", {
      method: "POST",
      body: reason ? { ...rest, reason } : rest,
      redirectOn401: false,
    });
    return { ok: true, data: { id: str(rec(rec(body).data).id) } };
  } catch (error) {
    return failure(error);
  }
}

export async function cancelAppointmentAction(appointmentId: string, input: unknown): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(appointmentId);
  const parsed = reasonSchema.safeParse(input);
  if (!id.success) return invalidInput({}, "Unknown appointment.");
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));

  try {
    await apiFetch(`/appointments/${id.data}/cancel`, { method: "POST", body: parsed.data, redirectOn401: false });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function rescheduleAppointmentAction(appointmentId: string, input: unknown): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(appointmentId);
  const parsed = rescheduleSchema.safeParse(input);
  if (!id.success) return invalidInput({}, "Unknown appointment.");
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));

  const { date, time, reason } = parsed.data;
  try {
    await apiFetch(`/appointments/${id.data}/reschedule`, {
      method: "POST",
      body: reason ? { date, time, reason } : { date, time },
      redirectOn401: false,
    });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function checkInAppointmentAction(appointmentId: string): Promise<ActionResult<{ token: string | null }>> {
  const id = idSchema.safeParse(appointmentId);
  if (!id.success) return invalidInput({}, "Unknown appointment.");

  try {
    const body = await apiFetch<unknown>(`/appointments/${id.data}/check-in`, { method: "POST", redirectOn401: false });
    return { ok: true, data: { token: tokenOf(rec(body).data) } };
  } catch (error) {
    return failure(error);
  }
}

export async function markNoShowAction(appointmentId: string): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(appointmentId);
  if (!id.success) return invalidInput({}, "Unknown appointment.");

  try {
    await apiFetch(`/appointments/${id.data}/no-show`, { method: "POST", redirectOn401: false });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}
'@

Save-File 'src/features/appointments/slot-picker.tsx' @'
"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { DateField } from "@/components/ui/date-field";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorNotice } from "@/components/ui/notice";
import { SelectField } from "@/components/ui/select-field";
import type { ClientError } from "@/lib/api/errors";
import { addDays, parseIso, weekdayName } from "@/lib/calendar";
import { formatLocalDate, formatLocalTime } from "@/lib/datetime";
import { loadSlotsAction } from "./actions";
import { SLOT_RANGE_OPTIONS } from "./options";
import type { SlotDay } from "./parse";

export type PickedSlot = { date: string; time: string };

type Props = {
  practitionerId: string;
  timezone: string | null;
  today: string;
  value: PickedSlot | null;
  onChange: (slot: PickedSlot | null) => void;
  /** Change this number to reload the slots (after "slot_unavailable"). */
  reloadKey?: number;
  /** A walk-in: today only, and the slot that is running now is listed too. */
  lockToToday?: boolean;
};

type Loaded = { key: string; days: SlotDay[]; error: ClientError | null };

export function SlotPicker({ practitionerId, timezone, today, value, onChange, reloadKey = 0, lockToToday = false }: Props) {
  const [from, setFrom] = useState(today);
  const [range, setRange] = useState("7");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const requestId = useRef(0);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  });

  const fromDate = lockToToday ? today : from;
  const validFrom = parseIso(fromDate) !== null;
  const toDate = lockToToday || !validFrom ? fromDate : addDays(fromDate, Number(range) - 1);
  const ready = Boolean(practitionerId) && validFrom;
  const key = `${practitionerId}|${fromDate}|${toDate}|${reloadKey}`;
  const loading = ready && loaded?.key !== key;

  useEffect(() => {
    if (!ready) return;
    const id = ++requestId.current;
    loadSlotsAction({ practitioner_id: practitionerId, from: fromDate, to: toDate, timezone, include_running: lockToToday }).then((response) => {
      if (id !== requestId.current) return; // an older request, ignore
      if (response.ok) {
        setLoaded({ key, days: response.data, error: null });
        const current = valueRef.current;
        if (current && !response.data.some((day) => day.date === current.date && day.times.includes(current.time))) {
          onChangeRef.current(null);
        }
        return;
      }
      if (response.error.code === "unauthenticated") {
        window.location.assign("/api/auth/session-expired");
        return;
      }
      setLoaded({ key, days: [], error: response.error });
    });
  }, [ready, practitionerId, fromDate, toDate, timezone, key, lockToToday]);

  const current = loaded?.key === key ? loaded : null;

  return (
    <div className="flex flex-col gap-4">
      {lockToToday ? (
        <p className="text-sm text-ink">Today, {formatLocalDate(today)}</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
          <div className="md:col-span-5">
            <DateField label="From date" value={from} onChange={setFrom} disableFuture={false} minYear={Number(today.slice(0, 4))} />
          </div>
          <div className="md:col-span-3">
            <SelectField label="Show" options={SLOT_RANGE_OPTIONS} value={range} onChange={setRange} />
          </div>
        </div>
      )}
      {validFrom && fromDate < today ? <p className="text-xs text-muted">That date has passed. Choose today or a later date.</p> : null}

      {!practitionerId ? (
        <p className="text-sm text-muted">Choose a doctor to see free slots.</p>
      ) : !validFrom ? (
        <p className="text-sm text-muted">Enter a valid date.</p>
      ) : loading ? (
        <p role="status" className="text-sm text-muted">Loading slots&hellip;</p>
      ) : current?.error ? (
        <ErrorNotice error={current.error} />
      ) : current && current.days.length === 0 ? (
        <EmptyState title="No free slots" description="This doctor has no free slot in this range. Try other dates, or check the doctor's working hours in Administration." />
      ) : (
        <div className="flex flex-col gap-3">
          {current?.days.map((day) => (
            <div key={day.date} className="border border-ink bg-surface p-4">
              <p className="font-headline text-xs font-bold uppercase tracking-wider text-ink">
                {weekdayName(day.date)}, {formatLocalDate(day.date)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {day.times.map((time) => {
                  const selected = value?.date === day.date && value.time === time;
                  return (
                    <button
                      key={time}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onChange({ date: day.date, time })}
                      className={clsx(
                        "h-9 min-w-16 border px-3 text-sm font-semibold",
                        selected ? "border-section bg-section text-white" : "border-ink bg-surface text-ink hover:border-section hover:bg-section-soft",
                      )}
                    >
                      {formatLocalTime(time)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
'@

Save-File 'src/features/appointments/reschedule-dialog.tsx' @'
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TextareaField } from "@/components/ui/textarea-field";
import { useToast } from "@/components/ui/toast-provider";
import { formatLocalDate, formatLocalTime } from "@/lib/datetime";
import { rescheduleAppointmentAction } from "./actions";
import type { AppointmentItem } from "./parse";
import { SlotPicker, type PickedSlot } from "./slot-picker";

type Props = { item: AppointmentItem | null; today: string; timezone: string | null; onClose: () => void; onDone: () => void };

function RescheduleBody({ item, today, timezone, onClose, onDone }: Omit<Props, "item"> & { item: AppointmentItem }) {
  const toast = useToast();
  const [slot, setSlot] = useState<PickedSlot | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  async function confirm() {
    if (!slot) return;
    setBusy(true);
    const response = await rescheduleAppointmentAction(item.id, { ...slot, reason });
    setBusy(false);

    if (response.ok) {
      toast.success("Appointment rescheduled.");
      onDone();
      return;
    }
    if (response.error.code === "unauthenticated") {
      window.location.assign("/api/auth/session-expired");
      return;
    }
    if (response.error.code === "slot_unavailable") {
      setSlot(null);
      setReloadKey((key) => key + 1);
    }
    toast.fromError(response.error, { useFieldMessage: true });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Now: {formatLocalDate(item.date)}, {formatLocalTime(item.time)} with {item.practitionerName || "the same doctor"}. Choose a new slot of the same doctor.
      </p>
      <SlotPicker practitionerId={item.practitionerId} timezone={timezone} today={today} value={slot} onChange={setSlot} reloadKey={reloadKey} />
      <TextareaField
        label="Reason"
        value={reason}
        onChange={setReason}
        maxLength={100}
        rows={2}
        hint="Optional, up to 100 characters. It is kept with the appointment's history."
      />
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={busy}>Close</Button>
        <Button onClick={confirm} loading={busy} disabled={!slot}>Reschedule</Button>
      </div>
    </div>
  );
}

export function RescheduleDialog({ item, ...rest }: Props) {
  return (
    <Modal open={item !== null} title="Reschedule appointment" size="lg" onClose={rest.onClose}>
      {item ? <RescheduleBody item={item} {...rest} /> : null}
    </Modal>
  );
}
'@

Save-File 'src/features/appointments/booking-form.tsx' @'
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { SelectField, type Option } from "@/components/ui/select-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { useToast } from "@/components/ui/toast-provider";
import { bookAppointmentAction } from "./actions";
import { APPOINTMENT_TYPE_OPTIONS } from "./options";
import { PatientPicker, type PickedPatient } from "./patient-picker";
import { SlotPicker, type PickedSlot } from "./slot-picker";

type Props = { mode: "booking" | "walk_in"; practitioners: Option[]; today: string; timezone: string | null };

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-ink bg-surface p-6">
      <h2 className="mb-4 font-headline text-sm font-bold uppercase tracking-wider text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function BookingForm({ mode, practitioners, today, timezone }: Props) {
  const router = useRouter();
  const toast = useToast();
  const walkIn = mode === "walk_in";

  const [patient, setPatient] = useState<PickedPatient | null>(null);
  const [practitionerId, setPractitionerId] = useState("");
  const [slot, setSlot] = useState<PickedSlot | null>(null);
  const [type, setType] = useState("consultation");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  function clearError(key: string) {
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function submit() {
    const problems: Record<string, string> = {};
    if (!patient) problems.patient_id = "Choose a patient.";
    if (!practitionerId) problems.practitioner_id = "Choose a doctor.";
    if (!slot) problems.slot = "Choose a time slot.";
    if (reason.length > 150) problems.reason = "At most 150 characters.";
    if (Object.keys(problems).length > 0 || !patient || !slot) {
      setErrors(problems);
      toast.error("Please complete the highlighted fields.");
      return;
    }

    setBusy(true);
    const response = await bookAppointmentAction({
      patient_id: patient.id,
      practitioner_id: practitionerId,
      date: slot.date,
      time: slot.time,
      appointment_type: type,
      source: walkIn ? "walk_in" : "staff",
      reason,
    });
    setBusy(false);

    if (response.ok) {
      toast.success(walkIn ? "Walk-in registered." : "Appointment booked.");
      router.push(`/appointments?date=${slot.date}&practitioner=${practitionerId}`);
      return;
    }
    const error = response.error;
    if (error.code === "unauthenticated") {
      window.location.assign("/api/auth/session-expired");
      return;
    }
    if (error.code === "slot_unavailable") {
      setSlot(null);
      setReloadKey((key) => key + 1); // reload the slots: someone else may have taken this one
      setErrors({ slot: "Choose another slot." });
    } else {
      const mapped: Record<string, string> = {};
      for (const [path, message] of Object.entries(error.fieldErrors)) mapped[path === "date" || path === "time" ? "slot" : path] = message;
      setErrors(mapped);
    }
    toast.fromError(error, { useFieldMessage: true });
  }

  if (practitioners.length === 0) {
    return <Notice tone="error">No active doctors were found, or you may not view them. Ask an administrator.</Notice>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Block title="1. Patient">
        <PatientPicker
          value={patient}
          onChange={(next) => {
            setPatient(next);
            clearError("patient_id");
          }}
          error={errors.patient_id}
        />
      </Block>

      <Block title={walkIn ? "2. Doctor and slot (today)" : "2. Doctor and slot"}>
        <div className="flex flex-col gap-5">
          <div className="max-w-md">
            <SelectField
              label="Doctor *"
              options={practitioners}
              value={practitionerId}
              onChange={(next) => {
                setPractitionerId(next);
                setSlot(null);
                clearError("practitioner_id");
              }}
              error={errors.practitioner_id}
            />
          </div>
          <SlotPicker
            practitionerId={practitionerId}
            timezone={timezone}
            today={today}
            value={slot}
            onChange={(next) => {
              setSlot(next);
              clearError("slot");
            }}
            reloadKey={reloadKey}
            lockToToday={walkIn}
          />
          {errors.slot ? <p className="text-xs font-medium text-error">{errors.slot}</p> : null}
          {walkIn ? (
            <p className="text-xs text-muted">Only today&apos;s free slots are listed, including the slot that is running now.</p>
          ) : null}
        </div>
      </Block>

      <Block title="3. Details">
        <div className="flex max-w-xl flex-col gap-5">
          <SelectField label="Type" options={APPOINTMENT_TYPE_OPTIONS} value={type} onChange={setType} error={errors.appointment_type} />
          <TextareaField label="Reason for visit" value={reason} onChange={setReason} maxLength={150} error={errors.reason} hint="Optional, up to 150 characters." />
        </div>
      </Block>

      <div>
        <Button onClick={submit} loading={busy}>{walkIn ? "Register walk-in" : "Book appointment"}</Button>
      </div>
    </div>
  );
}
'@

# ================================================================ clinical (notes: current / draft, author text)

Save-File 'src/features/clinical/parse.ts' @'
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
'@

# ================================================================ practitioners (login link)

Save-File 'src/features/practitioners/parse.ts' @'
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
'@

Save-File 'src/app/(app)/admin/practitioners/[id]/page.tsx' @'
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
  const login = practitioner.linkedUser ? `Login: ${practitioner.linkedUser}` : practitioner.userId ? "Login account linked" : "No login account linked";

  return (
    <>
      <PageHeader
        title={practitioner.name || "Practitioner"}
        description={[
          practitioner.type ? labelFor(PRACTITIONER_TYPE_OPTIONS, practitioner.type) : "",
          practitioner.departmentName,
          login,
          practitioner.joinedOn ? `Joined ${formatLocalDate(practitioner.joinedOn)}` : "",
        ]
          .filter(Boolean)
          .join(" \u00b7 ")}
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
        {practitioner.type === "doctor" && !practitioner.userId ? (
          <Notice>This doctor has no login account linked, so they cannot start consultations. A login can only be linked when the profile is created.</Notice>
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
'@

# ================================================================ audit (actor and resource objects)

Save-File 'src/features/audit/parse.ts' @'
import { parsePage, type PageInfo } from "@/lib/api/meta";
import { list, rec, str, strOrNull } from "@/lib/utils/guards";

export type AuditEvent = {
  id: string;
  at: string | null;
  module: string;
  actorId: string;
  actorType: string;
  action: string;
  resourceType: string;
  resourceId: string;
  outcome: string;
  correlationId: string;
};

/** Real shape: actor is { id, type } (no name) and resource is { type, id }. */
export function parseAuditEvents(body: unknown): { items: AuditEvent[] } & PageInfo {
  const items = list(rec(body).data).map((raw) => {
    const e = rec(raw);
    const actor = rec(e.actor);
    const resource = rec(e.resource);
    return {
      id: str(e.id),
      at: strOrNull(e.occurred_at) ?? strOrNull(e.created_at),
      module: str(e.module),
      actorId: str(actor.id),
      actorType: str(actor.type),
      action: str(e.action),
      resourceType: str(resource.type) || str(e.resource_type),
      resourceId: str(resource.id) || str(e.resource_id),
      outcome: str(e.outcome),
      correlationId: str(e.correlation_id),
    };
  });
  return { items, ...parsePage(body, items.length) };
}
'@

Save-File 'src/features/audit/audit.test.ts' @'
import { describe, expect, it } from "vitest";
import { readAuditFilters } from "./filters";
import { parseAuditEvents } from "./parse";

describe("readAuditFilters", () => {
  it("drops everything that is not valid", () => {
    expect(readAuditFilters({ outcome: "bad", actor: "short", correlation_id: "x", from: "no", to: "2026-13-40", page: "0" })).toEqual({
      action: "", actor: "", resourceType: "", resourceId: "", outcome: "", correlationId: "", from: "", to: "", page: 1,
    });
  });
  it("keeps valid values and cuts long text", () => {
    const id = "01m57k2ggvtgmj3qdpmfw4pxa9";
    const f = readAuditFilters({ action: "a".repeat(200), actor: id, outcome: "denied", from: "2026-10-01", to: "2026-10-19", resource_type: "patient", resource_id: "x", page: "4" });
    expect(f.action).toHaveLength(80);
    expect(f).toMatchObject({ actor: id, outcome: "denied", from: "2026-10-01", to: "2026-10-19", resourceType: "patient", page: 4 });
  });
});

describe("parseAuditEvents (real schema)", () => {
  it("reads the actor and resource objects", () => {
    const { items } = parseAuditEvents({
      data: [{ id: "e1", occurred_at: "2026-10-19T08:00:00+00:00", module: "patient", action: "patient.viewed", actor: { id: "u1", type: "user" }, resource: { type: "patient", id: "p1" }, outcome: "success", correlation_id: "c1" }],
    });
    expect(items[0]).toMatchObject({ module: "patient", actorId: "u1", actorType: "user", action: "patient.viewed", resourceType: "patient", resourceId: "p1", outcome: "success" });
    expect(parseAuditEvents(null).items).toEqual([]);
  });
});
'@

Save-File 'src/app/(app)/admin/audit/page.tsx' @'
import { EmptyState } from "@/components/ui/empty-state";
import { NoAccess } from "@/components/ui/no-access";
import { ErrorNotice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { UrlPagination } from "@/components/ui/url-pagination";
import { AuditFilters } from "@/features/audit/audit-filters";
import { readAuditFilters } from "@/features/audit/filters";
import { parseAuditEvents } from "@/features/audit/parse";
import { parseUserList } from "@/features/identity/parse";
import { apiLoad } from "@/lib/api/load";
import { requireSession } from "@/lib/auth/session";
import { humanize } from "@/lib/format";
import { showInstant } from "@/lib/format-instant";
import { hospitalNow } from "@/lib/hospital";
import { can } from "@/lib/permissions";

const PAGE_SIZE = 25;

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireSession();
  const p = session.permissions;
  if (!can(p, "audit.event.view")) return <NoAccess />;

  const f = readAuditFilters(await searchParams);
  const [result, usersResult, now] = await Promise.all([
    apiLoad<unknown>("/audit/events", {
      query: {
        action: f.action,
        actor: f.actor,
        resource_type: f.resourceType,
        resource_id: f.resourceId,
        outcome: f.outcome,
        correlation_id: f.correlationId,
        from: f.from,
        to: f.to,
        per_page: PAGE_SIZE,
        page: f.page,
      },
    }),
    can(p, "identity.user.view") ? apiLoad<unknown>("/identity/users", { query: { per_page: 100 } }) : Promise.resolve(null),
    hospitalNow(),
  ]);
  const list = result.ok ? parseAuditEvents(result.data) : null;
  const users = usersResult && usersResult.ok ? parseUserList(usersResult.data).items.map((u) => ({ value: u.id, label: u.name || u.email })) : [];
  // The audit trail names its actor by id only. The names come from the users list when the viewer may read it.
  const names = new Map(users.map((u) => [u.value, u.label]));

  function whoOf(actorId: string, actorType: string): string {
    const known = names.get(actorId);
    if (known) return known;
    if (actorType && actorType !== "user") return humanize(actorType);
    return actorId ? `${actorId.slice(0, 8)}\u2026` : "\u2014";
  }

  return (
    <>
      <PageHeader title="Audit trail" description="Who opened or changed what. Read only: nobody can add, change or delete an entry." />
      <AuditFilters
        initial={{ action: f.action, actor: f.actor, resource_type: f.resourceType, resource_id: f.resourceId, outcome: f.outcome, correlation_id: f.correlationId, from: f.from, to: f.to }}
        users={users}
      />

      {!result.ok ? (
        <ErrorNotice error={result.error} />
      ) : list && list.items.length === 0 ? (
        <EmptyState title="No entries" description="Nothing matches these filters." />
      ) : list ? (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto border border-ink bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink font-headline text-xs uppercase tracking-wider">
                <tr>
                  <th scope="col" className="p-3">When</th>
                  <th scope="col" className="p-3">Who</th>
                  <th scope="col" className="p-3">Action</th>
                  <th scope="col" className="p-3">Resource</th>
                  <th scope="col" className="p-3">Outcome</th>
                  <th scope="col" className="p-3">Reference</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((event, index) => (
                  <tr key={event.id || index} className="border-b border-accent align-top last:border-b-0 hover:bg-section-soft">
                    <td className="p-3 whitespace-nowrap text-muted">{showInstant(event.at, now.timezone) || "\u2014"}</td>
                    <td className="p-3">{whoOf(event.actorId, event.actorType)}</td>
                    <td className="p-3">
                      <span className="font-medium">{event.action || "\u2014"}</span>
                      {event.module ? <span className="block text-xs text-muted">{event.module}</span> : null}
                    </td>
                    <td className="p-3">
                      {event.resourceType || "\u2014"}
                      {event.resourceId ? <span className="block break-all text-xs text-muted">{event.resourceId}</span> : null}
                    </td>
                    <td className="p-3">
                      <StatusBadge label={humanize(event.outcome || "unknown")} tone={event.outcome === "success" ? "active" : event.outcome === "denied" ? "neutral" : "bad"} />
                    </td>
                    <td className="p-3 break-all text-xs text-muted">{event.correlationId || "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <UrlPagination page={list.currentPage} lastPage={list.lastPage} total={list.total} pageSize={PAGE_SIZE} />
        </div>
      ) : null}
    </>
  );
}
'@

# ================================================================ users (search)

Save-File 'src/features/identity/user-filters.tsx' @'
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { useNavigationProgress } from "@/components/ui/navigation-progress";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { USER_STATUS_OPTIONS } from "./options";

/** Search by name or email (at least 2 characters). Staff data, not patient data, so it lives in the URL. */
export function UserFilters({ q, status }: { q: string; status: string }) {
  const router = useRouter();
  const progress = useNavigationProgress();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState(q);

  function go(next: Partial<{ q: string; status: string }>) {
    const params = new URLSearchParams();
    const nextQ = (next.q ?? text).trim();
    const nextStatus = next.status ?? status;
    if (nextQ) params.set("q", nextQ);
    if (nextStatus) params.set("status", nextStatus);
    progress.start();
    startTransition(() => router.push(`/admin/users${params.size > 0 ? `?${params.toString()}` : ""}`));
  }

  return (
    <div aria-busy={pending || undefined} className={clsx("mb-6 grid grid-cols-1 items-end gap-5 border border-ink bg-surface p-6 transition-opacity md:grid-cols-12", pending && "opacity-60")}>
      <div className="md:col-span-5">
        <TextField
          label="Name or email"
          autoComplete="off"
          maxLength={100}
          value={text}
          hint="At least 2 characters."
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              go({});
            }
          }}
        />
      </div>
      <div className="md:col-span-3">
        <SelectField label="Status" options={USER_STATUS_OPTIONS} value={status} onChange={(value) => go({ status: value })} allowEmpty emptyLabel="All" placeholder="All" />
      </div>
      <div className="flex gap-3 md:col-span-4">
        <Button variant="secondary" className="flex-1" onClick={() => go({})}>Search</Button>
        <Button
          variant="secondary"
          className="flex-1"
          disabled={!q && !status}
          onClick={() => {
            setText("");
            go({ q: "", status: "" });
          }}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
'@

Save-File 'src/app/(app)/admin/users/page.tsx' @'
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { NoAccess } from "@/components/ui/no-access";
import { ErrorNotice, Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { UrlPagination } from "@/components/ui/url-pagination";
import { AddUser } from "@/features/identity/add-user";
import { USER_STATUS_OPTIONS, userTone } from "@/features/identity/options";
import { displayRole, parseUserList } from "@/features/identity/parse";
import { UserFilters } from "@/features/identity/user-filters";
import { labelFor } from "@/features/patients/options";
import { apiLoad } from "@/lib/api/load";
import { requireSession } from "@/lib/auth/session";
import { showInstant } from "@/lib/format-instant";
import { hospitalNow } from "@/lib/hospital";
import { firstParam, readPage } from "@/lib/page-param";
import { can } from "@/lib/permissions";

const PAGE_SIZE = 25;

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireSession();
  const p = session.permissions;
  if (!can(p, "identity.user.view")) return <NoAccess />;

  const raw = await searchParams;
  const page = readPage(raw.page);
  const q = firstParam(raw.q).trim().slice(0, 100);
  const status = USER_STATUS_OPTIONS.some((o) => o.value === firstParam(raw.status)) ? firstParam(raw.status) : "";
  const searching = q.length >= 2; // the server refuses a shorter term

  const [result, now] = await Promise.all([
    apiLoad<unknown>("/identity/users", { query: { q: searching ? q : "", status, per_page: PAGE_SIZE, page } }),
    hospitalNow(),
  ]);
  const list = result.ok ? parseUserList(result.data) : null;

  return (
    <>
      <PageHeader
        title="Users"
        description="Login accounts of the staff. Search by name or email."
        actions={can(p, "identity.user.manage") ? <AddUser /> : undefined}
      />
      <UserFilters q={q} status={status} />
      {q.length === 1 ? (
        <div className="mb-6">
          <Notice>Type at least 2 characters to search. All users are listed until then.</Notice>
        </div>
      ) : null}

      {!result.ok ? (
        <ErrorNotice error={result.error} />
      ) : list && list.items.length === 0 ? (
        <EmptyState title="No users" description={searching || status ? "No user matches these filters." : "No user accounts were found."} />
      ) : list ? (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto border border-ink bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink font-headline text-xs uppercase tracking-wider">
                <tr>
                  <th scope="col" className="p-3">Name</th>
                  <th scope="col" className="p-3">Email</th>
                  <th scope="col" className="p-3">Roles</th>
                  <th scope="col" className="p-3">Last sign-in</th>
                  <th scope="col" className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((user) => (
                  <tr key={user.id} className="border-b border-accent last:border-b-0 hover:bg-section-soft">
                    <td className="p-3">
                      <Link href={`/admin/users/${user.id}`} prefetch={false} className="font-medium underline">{user.name || user.email}</Link>
                    </td>
                    <td className="p-3 break-all">{user.email}</td>
                    <td className="p-3">{user.roles.length > 0 ? user.roles.map((r) => displayRole(r.name)).join(", ") : "\u2014"}</td>
                    <td className="p-3 text-muted">{showInstant(user.lastLoginAt, now.timezone) || "\u2014"}</td>
                    <td className="p-3"><StatusBadge label={labelFor(USER_STATUS_OPTIONS, user.status)} tone={userTone(user.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <UrlPagination page={list.currentPage} lastPage={list.lastPage} total={list.total} pageSize={PAGE_SIZE} />
        </div>
      ) : null}
    </>
  );
}
'@

# ================================================================ done

Write-Host ''
Write-Host ('Done. {0} files written, {1} removed.' -f $written.Count, $removed.Count) -ForegroundColor Green
Write-Host ('Old copies: {0}' -f $backup)
Write-Host 'Next: npm run typecheck ; npm test ; npm run lint'