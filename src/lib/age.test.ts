import { describe, expect, it } from "vitest";
import { ageParts, formatAge } from "./age";

describe("age", () => {
  it("counts whole years", () => {
    expect(formatAge("2014-07-11", "2026-10-19")).toBe("12 years");
    expect(formatAge("2025-10-19", "2026-10-19")).toBe("1 year");
  });
  it("does not count the year until the birthday", () => {
    expect(ageParts("2014-10-20", "2026-10-19")).toEqual({ years: 11, months: 11, days: 29 });
  });
  it("uses months and days for babies", () => {
    expect(formatAge("2026-01-15", "2026-10-19")).toBe("9 months");
    expect(formatAge("2026-10-10", "2026-10-19")).toBe("9 days");
  });
  it("refuses future or invalid dates", () => {
    expect(formatAge("2030-01-01", "2026-10-19")).toBe("");
    expect(formatAge("12/10/2026", "2026-10-19")).toBe("");
  });
});