import { describe, expect, it } from "vitest";
import { buildLines, emptyLine, type LineDraft } from "./lines";

const id = "01m57k2ggvtgmj3qdpmfw4pxa9";
const service = (patch: Partial<LineDraft> = {}): LineDraft => ({ ...emptyLine("service"), serviceId: id, ...patch });
const custom = (patch: Partial<LineDraft> = {}): LineDraft => ({ ...emptyLine("custom"), description: "Dressing", unitPrice: "250", ...patch });

describe("buildLines", () => {
  it("sends only the service for a price-list line", () => {
    expect(buildLines([service({ quantity: "2" })], { canDiscount: false })).toEqual({ ok: true, lines: [{ service_id: id, quantity: 2 }] });
  });
  it("sends money as a two-decimal string for a custom line", () => {
    expect(buildLines([custom({ taxPercent: "5" })], { canDiscount: false })).toEqual({
      ok: true,
      lines: [{ description: "Dressing", unit_price: "250.00", tax_percent: 5, quantity: 1 }],
    });
  });
  it("ignores a typed discount without permission and drops a zero discount", () => {
    const withText = service({ discount: "50" });
    expect(buildLines([withText], { canDiscount: false })).toEqual({ ok: true, lines: [{ service_id: id, quantity: 1 }] });
    expect(buildLines([withText], { canDiscount: true })).toEqual({ ok: true, lines: [{ service_id: id, quantity: 1, discount_amount: "50.00" }] });
    expect(buildLines([service({ discount: "0" })], { canDiscount: true })).toEqual({ ok: true, lines: [{ service_id: id, quantity: 1 }] });
  });
  it("reports what is wrong, line by line", () => {
    const result = buildLines([emptyLine("service"), custom({ unitPrice: "12.345", quantity: "0" })], { canDiscount: true });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].service).toBeDefined();
      expect(result.errors[1].unitPrice).toBeDefined();
      expect(result.errors[1].quantity).toBeDefined();
    }
  });
  it("needs at least one line", () => {
    expect(buildLines([], { canDiscount: true })).toMatchObject({ ok: false, message: "Add at least one line." });
  });
});