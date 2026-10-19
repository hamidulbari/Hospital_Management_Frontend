import { describe, expect, it } from "vitest";
import { groupLines } from "./bill-groups";
import type { InvoiceLine } from "./parse";

const line = (patch: Partial<InvoiceLine>): InvoiceLine => ({
  serviceId: "", code: "", category: "", description: "x", quantity: "1", unitPrice: "1.00", discount: "", taxPercent: "", taxAmount: "", total: "1.00", ...patch,
});

describe("groupLines", () => {
  it("groups by the category of the price-list service, in a fixed order", () => {
    const index = { s1: { code: "BED1", category: "bed" }, s2: { code: "C1", category: "consultation" } };
    const groups = groupLines([line({ serviceId: "s1" }), line({ serviceId: "s2" })], index);
    expect(groups.map((g) => g.label)).toEqual(["Consultation charges", "Room/Bed charges"]);
    expect(groups[1].lines[0].code).toBe("BED1");
  });
  it("puts a line without a known category under Other charges", () => {
    const groups = groupLines([line({ description: "Dressing" })], {});
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Other charges");
  });
  it("prefers what the line itself says", () => {
    const groups = groupLines([line({ serviceId: "s1", category: "procedure", code: "P9" })], { s1: { code: "BED1", category: "bed" } });
    expect(groups[0].label).toBe("Procedure charges");
    expect(groups[0].lines[0].code).toBe("P9");
  });
});