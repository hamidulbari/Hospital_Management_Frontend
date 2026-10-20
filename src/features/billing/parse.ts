import { parsePage, type PageInfo } from "@/lib/api/meta";
import { bool, list, num, rec, str, strOrNull, type Rec } from "@/lib/utils/guards";
import { toLocalSrc } from "@/lib/branding";
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
export type InvoiceHospital = {
  name: string;
  registrationNo: string;
  gstin: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  pincode: string;
  /** Our own address for the logo (never the backend address). null when no logo is set. */
  logoSrc: string | null;
  footerText: string;
  termsText: string;
};
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
    logoSrc: toLocalSrc(str(h.logo_url), "logo"),
    footerText: str(h.bill_footer_text),
    termsText: str(h.bill_terms_text),
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
