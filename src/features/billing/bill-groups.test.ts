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
