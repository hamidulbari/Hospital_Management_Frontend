import { describe, expect, it } from "vitest";
import { daysBetween, weekdayName } from "./calendar";
import { localParts } from "./datetime";

describe("time helpers", () => {
  it("names the weekday", () => {
    expect(weekdayName("2026-10-19")).toBe("Monday");
    expect(weekdayName("bad")).toBe("");
  });
  it("counts days between dates", () => {
    expect(daysBetween("2026-10-19", "2026-10-19")).toBe(0);
    expect(daysBetween("2026-10-19", "2026-11-01")).toBe(13);
    expect(daysBetween("2026-10-19", "2026-10-18")).toBe(-1);
    expect(daysBetween("x", "2026-10-18")).toBeNull();
  });
  it("gives the local date and time of an instant", () => {
    expect(localParts(new Date("2026-10-18T20:30:00Z"), "Asia/Kolkata")).toEqual({ date: "2026-10-19", time: "02:00" });
    expect(localParts(new Date("2026-10-18T20:30:00Z"), "Not/AZone")).toBeNull();
  });
});