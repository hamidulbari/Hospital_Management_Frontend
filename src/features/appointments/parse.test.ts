import { describe, expect, it } from "vitest";
import { parseAppointment, parseSlots, tokenOf } from "./parse";

describe("tokenOf", () => {
  it("finds a token in different shapes", () => {
    expect(tokenOf({ token_number: 17 })).toBe("17");
    expect(tokenOf({ queue_token: { number: "A-4" } })).toBe("A-4");
    expect(tokenOf({})).toBeNull();
  });
});

describe("parseSlots", () => {
  it("reads a flat list", () => {
    expect(parseSlots({ data: [{ date: "2026-10-20", time: "09:30" }, { date: "2026-10-20", time: "09:00" }] }, null)).toEqual([
      { date: "2026-10-20", times: ["09:00", "09:30"] },
    ]);
  });
  it("reads days with nested slots and keyed objects", () => {
    expect(parseSlots({ data: [{ date: "2026-10-20", slots: ["10:00", { time: "10:30" }] }] }, null)[0].times).toEqual(["10:00", "10:30"]);
    expect(parseSlots({ data: { "2026-10-21": ["08:00"] } }, null)).toEqual([{ date: "2026-10-21", times: ["08:00"] }]);
  });
  it("converts UTC instants to the hospital timezone", () => {
    expect(parseSlots({ data: [{ starts_at: "2026-10-20T05:30:00+00:00" }] }, "Asia/Kolkata")).toEqual([
      { date: "2026-10-20", times: ["11:00"] },
    ]);
  });
  it("never throws on garbage", () => {
    expect(parseSlots(null, null)).toEqual([]);
  });
});

describe("parseAppointment", () => {
  it("reads nested patient and practitioner", () => {
    const a = parseAppointment(
      { id: "1", date: "2026-10-20", start_time: "09:00:00", status: "booked", patient: { full_name: "Asha Rao", mrn: "M1" }, practitioner: { id: "p1", full_name: "Dr Khan" } },
      null,
    );
    expect(a).toMatchObject({ time: "09:00", patientName: "Asha Rao", patientMrn: "M1", practitionerId: "p1", practitionerName: "Dr Khan" });
  });
});