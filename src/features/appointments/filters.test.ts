import { describe, expect, it } from "vitest";
import { readDayFilters } from "./filters";

const statuses = ["booked", "cancelled"];

describe("readDayFilters", () => {
  it("uses defaults for missing or invalid values", () => {
    expect(readDayFilters({}, "2026-10-19", statuses)).toEqual({ date: "2026-10-19", practitioner: "", status: "", page: 1 });
    expect(readDayFilters({ date: "nope", practitioner: "short", status: "x", page: "0" }, "2026-10-19", statuses)).toEqual({
      date: "2026-10-19", practitioner: "", status: "", page: 1,
    });
  });
  it("keeps valid values", () => {
    const id = "01m57k2ggvtgmj3qdpmfw4pxa9";
    expect(readDayFilters({ date: "2026-10-20", practitioner: id, status: "booked", page: "3" }, "2026-10-19", statuses)).toEqual({
      date: "2026-10-20", practitioner: id, status: "booked", page: 3,
    });
  });
});