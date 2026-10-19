import { describe, expect, it } from "vitest";
import { parseInvoice, parseServices, parseStatement } from "./parse";

describe("parseInvoice", () => {
  it("keeps money as the server's strings", () => {
    const invoice = parseInvoice({
      data: {
        id: "i1", invoice_number: "INV-1", status: "issued", patient: { id: "p1", full_name: "Asha Rao", mrn: "M1" },
        total: "922.00", balance: "422.00",
        lines: [{ service_id: "s1", description: "Consultation", quantity: 1, unit_price: "500.00", line_total: "500.00" }],
        payments: [{ id: "pay1", amount: "500.00", method: "cash", status: "posted" }],
      },
    });
    expect(invoice).toMatchObject({ number: "INV-1", total: "922.00", balance: "422.00", patientName: "Asha Rao" });
    expect(invoice.lines[0]).toMatchObject({ unitPrice: "500.00", total: "500.00", quantity: "1" });
    expect(invoice.payments[0]).toMatchObject({ amount: "500.00", status: "posted" });
  });
  it("never throws on garbage", () => {
    expect(parseInvoice(null).lines).toEqual([]);
  });
});

describe("parseStatement and parseServices", () => {
  it("reads the outstanding total and services", () => {
    expect(parseStatement({ data: { outstanding_total: "1200.00", invoices: [{ id: "i1", balance: "1200.00" }] } }).outstanding).toBe("1200.00");
    expect(parseServices({ data: [{ id: "s1", code: "C1", name: "Consultation", unit_price: "500.00", is_active: true }] }).items[0]).toMatchObject({
      unitPrice: "500.00",
      active: true,
    });
  });
});