import { describe, expect, it } from "vitest";
import { parseExceptions, parsePractitioner, parseRules } from "./parse";

describe("practitioner parsers", () => {
  it("reads a profile with specializations and credentials", () => {
    const p = parsePractitioner({
      data: {
        id: "p1", full_name: "Dr Khan", practitioner_type: "doctor", status: "active",
        specializations: [{ id: "s1", name: "Cardiology", is_primary: true }],
        credentials: [{ id: "c1", credential_type: "medical_council_registration", registration_number: "R-1", status: "pending" }],
      },
    });
    expect(p).toMatchObject({ name: "Dr Khan", type: "doctor", status: "active" });
    expect(p.specializations[0]).toEqual({ id: "s1", name: "Cardiology", isPrimary: true });
    expect(p.credentials[0]).toMatchObject({ number: "R-1", status: "pending" });
  });
  it("sorts working hours by weekday and cuts the seconds", () => {
    const rules = parseRules({
      data: [
        { id: "b", weekday: 3, start_time: "14:00:00", end_time: "17:00:00", slot_minutes: 15 },
        { id: "a", weekday: 1, start_time: "09:00:00", end_time: "13:00:00", slot_minutes: 15 },
      ],
    });
    expect(rules.map((r) => r.id)).toEqual(["a", "b"]);
    expect(rules[0]).toMatchObject({ start: "09:00", end: "13:00", slotMinutes: "15" });
  });
  it("sorts exceptions by date and never throws", () => {
    expect(parseExceptions({ data: [{ id: "2", exception_date: "2026-11-02", kind: "blocked" }, { id: "1", exception_date: "2026-10-30", kind: "extra" }] }).map((e) => e.id)).toEqual(["1", "2"]);
    expect(parsePractitioner(null).specializations).toEqual([]);
  });
});