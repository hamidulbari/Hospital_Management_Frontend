import { parsePage, type PageInfo } from "@/lib/api/meta";
import { bool, list, rec, str, strOrNull, type Rec } from "@/lib/utils/guards";
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
};
export type PaymentItem = { id: string; amount: string; method: string; reference: string; status: string; receipt: string; at: string | null; reason: string | null };

export type InvoiceDetail = {
  id: string;
  number: string;
  status: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  patientSex: string;
  patientDob: string;
  patientPhone: string;
  issuedAt: string | null;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
  paid: string;
  balance: string;
  lines: InvoiceLine[];
  payments: PaymentItem[];
};

export type InvoiceRow = { id: string; number: string; status: string; patientName: string; patientMrn: string; date: string | null; total: string; balance: string };
export type StatementInvoice = { id: string; number: string; status: string; date: string | null; total: string; paid: string; balance: string };
export type Statement = { patientName: string; patientMrn: string; outstanding: string; invoices: StatementInvoice[] };

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

/** The invoice number: a draft has none. The field name is not documented, so the usual ones are tried. */
function numberOf(source: Rec): string {
  return firstText(source, ["invoice_number", "invoice_no", "number", "no", "invoice_code", "code"]);
}

function dateOf(source: Rec): string | null {
  return firstNullable(source, ["issued_at", "invoice_date", "issue_date", "created_at"]);
}

function parseLine(raw: unknown): InvoiceLine {
  const l = rec(raw);
  const service = rec(l.service);
  return {
    serviceId: str(l.service_id) || str(service.id),
    code: str(l.service_code) || str(service.code),
    category: str(l.category) || str(service.category),
    description: str(l.description) || str(l.service_name) || str(service.name),
    quantity: text(l.quantity),
    unitPrice: firstMoney(l, ["unit_price"]),
    discount: firstMoney(l, ["discount_amount", "discount"]),
    taxPercent: text(l.tax_percent),
    taxAmount: firstMoney(l, ["tax_amount"]),
    total: firstMoney(l, ["line_total", "total", "amount"]),
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
    receipt: firstText(p, ["receipt_number", "receipt_no", "receipt"]),
    at: firstNullable(p, ["paid_at", "received_at", "payment_date", "posted_at", "created_at", "date"]),
    reason: firstNullable(p, ["reversal_reason", "reversed_reason", "reason"]),
  };
}

export function parseInvoice(body: unknown): InvoiceDetail {
  const i = rec(rec(body).data);
  const patient = rec(i.patient);
  return {
    id: str(i.id),
    number: numberOf(i),
    status: str(i.status),
    patientId: str(patient.id) || str(i.patient_id),
    patientName: nameOf(patient) || str(i.patient_name),
    patientMrn: str(patient.mrn) || str(i.patient_mrn),
    patientSex: str(patient.sex_at_birth) || str(patient.sex),
    patientDob: str(patient.date_of_birth),
    patientPhone: str(patient.phone),
    issuedAt: dateOf(i),
    subtotal: firstMoney(i, ["subtotal", "subtotal_amount", "sub_total"]),
    discountTotal: firstMoney(i, ["discount_total", "total_discount", "discount_amount"]),
    taxTotal: firstMoney(i, ["tax_total", "total_tax", "tax_amount"]),
    total: firstMoney(i, ["total", "grand_total", "total_amount"]),
    paid: firstMoney(i, ["paid_amount", "amount_paid", "paid_total", "paid"]),
    balance: firstMoney(i, ["balance", "balance_due", "outstanding"]),
    lines: list(i.lines).map(parseLine),
    payments: list(i.payments).map(parsePayment),
  };
}

export function parseInvoiceList(body: unknown): { items: InvoiceRow[] } & PageInfo {
  const items = list(rec(body).data).map((raw) => {
    const i = rec(raw);
    const patient = rec(i.patient);
    return {
      id: str(i.id),
      number: numberOf(i),
      status: str(i.status),
      patientName: nameOf(patient) || str(i.patient_name),
      patientMrn: str(patient.mrn) || str(i.patient_mrn),
      date: dateOf(i),
      total: firstMoney(i, ["total", "grand_total", "total_amount"]),
      balance: firstMoney(i, ["balance", "balance_due", "outstanding"]),
    };
  });
  return { items, ...parsePage(body, items.length) };
}

export function parseStatement(body: unknown): Statement {
  const s = rec(rec(body).data);
  const patient = rec(s.patient);
  const rows = list(s.invoices).length > 0 ? list(s.invoices) : list(s.items);
  return {
    patientName: nameOf(patient) || str(s.patient_name),
    patientMrn: str(patient.mrn) || str(s.patient_mrn),
    outstanding: firstMoney(s, ["outstanding_total", "outstanding", "total_outstanding", "balance_total", "balance"]),
    invoices: rows.map((raw) => {
      const i = rec(raw);
      return {
        id: str(i.id),
        number: numberOf(i),
        status: str(i.status),
        date: dateOf(i),
        total: firstMoney(i, ["total", "grand_total", "total_amount"]),
        paid: firstMoney(i, ["paid_amount", "amount_paid", "paid_total", "paid"]),
        balance: firstMoney(i, ["balance", "balance_due", "outstanding"]),
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
      unitPrice: firstMoney(s, ["unit_price", "price"]),
      taxPercent: text(s.tax_percent),
      active: bool(s.is_active) || bool(s.active),
    };
  });
  return { items, ...parsePage(body, items.length) };
}