import { describe, expect, it } from "vitest";
import { format12h, from12h, isValidTime, maskTime, shortTime, to12h } from "./time-input";

describe("time input", () => {
  it("puts the colon in while typing", () => {
    expect(maskTime("9")).toBe("9");
    expect(maskTime("0930")).toBe("09:30");
    expect(maskTime("093099")).toBe("09:30");
    expect(maskTime("ab09-3")).toBe("09:3");
  });
  it("accepts only real 24-hour times", () => {
    expect(isValidTime("00:00")).toBe(true);
    expect(isValidTime("23:59")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
    expect(isValidTime("9:30")).toBe(false);
    expect(isValidTime("09:60")).toBe(false);
  });
  it("cuts the seconds", () => {
    expect(shortTime("09:00:00")).toBe("09:00");
    expect(shortTime("x")).toBe("x");
  });
});

describe("12-hour clock", () => {
  it("reads a 24-hour time as hour, minute and AM or PM", () => {
    expect(to12h("14:30")).toEqual({ hour: 2, minute: 30, meridiem: "PM" });
    expect(to12h("00:05")).toEqual({ hour: 12, minute: 5, meridiem: "AM" });
    expect(to12h("12:00")).toEqual({ hour: 12, minute: 0, meridiem: "PM" });
    expect(to12h("")).toBeNull();
    expect(to12h("25:00")).toBeNull();
  });
  it("builds the 24-hour time the server wants", () => {
    expect(from12h(12, 0, "AM")).toBe("00:00");
    expect(from12h(12, 0, "PM")).toBe("12:00");
    expect(from12h(2, 30, "PM")).toBe("14:30");
    expect(from12h(9, 5, "AM")).toBe("09:05");
  });
  it("shows it as 12-hour text", () => {
    expect(format12h("14:30")).toBe("02:30 PM");
    expect(format12h("00:00")).toBe("12:00 AM");
    expect(format12h("")).toBe("");
  });
});