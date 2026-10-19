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
