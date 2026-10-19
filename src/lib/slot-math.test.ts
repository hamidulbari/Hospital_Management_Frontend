import { describe, expect, it } from "vitest";
import { exactCounts, formatDuration, nearest, slotLengthFor, slotsIn, toMinutes, windowMinutes } from "./slot-math";

describe("slot math", () => {
  it("measures the window", () => {
    expect(toMinutes("09:30")).toBe(570);
    expect(toMinutes("9:30")).toBeNull();
    expect(windowMinutes("11:20", "13:00")).toBe(100);
    expect(windowMinutes("13:00", "11:20")).toBeNull();
    expect(windowMinutes("", "13:00")).toBeNull();
  });
  it("counts slots and works out a slot length", () => {
    expect(slotsIn(100, 10)).toBe(10);
    expect(slotsIn(100, 15)).toBe(6);
    expect(slotsIn(100, 0)).toBe(0);
    expect(slotLengthFor(100, 10)).toBe(10);
    expect(slotLengthFor(100, 3)).toBe(33);
    expect(slotLengthFor(100, 0)).toBe(0);
  });
  it("writes a duration", () => {
    expect(formatDuration(100)).toBe("1 h 40 min");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(45)).toBe("45 min");
  });
});

describe("counts that fit exactly", () => {
  it("lists the counts with no minutes left over", () => {
    expect(exactCounts(100)).toEqual([1, 2, 4, 5, 10, 20]);
    expect(exactCounts(240)).toEqual(expect.arrayContaining([8, 16, 24]));
    expect(exactCounts(240)).not.toContain(7);
    expect(exactCounts(240).every((count) => 240 % count === 0)).toBe(true);
  });
  it("keeps slots within the server's 5 to 240 minutes", () => {
    expect(exactCounts(600)).not.toContain(1); // 600 minutes in one slot is too long
    expect(exactCounts(600)).toContain(5);
  });
  it("picks the values closest to a target", () => {
    expect(nearest([1, 2, 4, 5, 10, 20], 7, 3)).toEqual([4, 5, 10]);
    expect(nearest([], 7)).toEqual([]);
  });
});