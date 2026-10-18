import { describe, expect, it } from "vitest";
import { formatInstant, formatLocalDate, formatLocalTime, todayInTimeZone } from "./datetime";

describe("datetime", () => {
  it("formats hospital-local dates and times as plain text", () => {
    expect(formatLocalDate("2026-10-18")).toBe("18 Oct 2026");
    expect(formatLocalDate("nonsense")).toBe("nonsense");
    expect(formatLocalTime("09:30:00")).toBe("09:30");
    expect(formatLocalTime("09:30")).toBe("09:30");
  });
  it("shows a UTC instant in the hospital timezone", () => {
    expect(formatInstant("2026-10-18T20:30:00+00:00", "Asia/Kolkata")).toBe("19 Oct 2026, 02:00");
    expect(formatInstant("not a date", "Asia/Kolkata")).toBe("not a date");
  });
  it("finds today in the hospital timezone", () => {
    const now = new Date("2026-10-18T20:30:00Z");
    expect(todayInTimeZone("Asia/Kolkata", now)).toBe("2026-10-19");
    expect(todayInTimeZone("UTC", now)).toBe("2026-10-18");
  });
});