import { describe, expect, it } from "vitest";
import { parsePatient, parsePatientList } from "./parse";

describe("parsePatient", () => {
  it("builds the display name and reads consents", () => {
    const p = parsePatient({
      id: "01a", mrn: "M1", first_name: "Asha", last_name: "Rao", sex_at_birth: "female",
      consents: [{ id: "c1", type: "treatment", status: "withdrawn" }, { id: "c2", type: "research", status: "granted" }],
    });
    expect(p.displayName).toBe("Asha Rao");
    expect(p.consents.map((c) => c.withdrawn)).toEqual([true, false]);
  });
  it("never throws on garbage", () => {
    expect(parsePatient(null).displayName).toBe("");
    expect(parsePatientList(null)).toEqual({ items: [], currentPage: 1, lastPage: 1, total: 0 });
  });
});