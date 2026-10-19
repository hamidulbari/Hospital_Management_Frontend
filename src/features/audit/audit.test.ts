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
