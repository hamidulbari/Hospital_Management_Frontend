import { describe, expect, it } from "vitest";
import { addDays, addMonths, formatDisplay, maskInput, monthWeeks, parseDisplay, parseIso } from "./calendar";

describe("calendar", () => {
  it("accepts only real dates", () => {
    expect(parseIso("2026-10-18")).toEqual({ y: 2026, m: 10, d: 18 });
    expect(parseIso("2026-02-30")).toBeNull();
    expect(parseDisplay("29/02/2024")).toBe("2024-02-29");
    expect(parseDisplay("29/02/2023")).toBeNull();
    expect(parseDisplay("1/1/2020")).toBeNull();
  });
  it("formats and masks", () => {
    expect(formatDisplay("2026-10-18")).toBe("18/10/2026");
    expect(maskInput("1")).toBe("1");
    expect(maskInput("1210")).toBe("12/10");
    expect(maskInput("12102026999")).toBe("12/10/2026");
    expect(maskInput("ab12-10")).toBe("12/10");
  });
  it("moves days and months", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-01-15", -1)).toBe("2025-12-15");
  });
  it("builds Monday-first weeks", () => {
    const weeks = monthWeeks(2026, 10); // 1 Oct 2026 is a Thursday
    expect(weeks[0][3]).toBe("2026-10-01");
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });
});