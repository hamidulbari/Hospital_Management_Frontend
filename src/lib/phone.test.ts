import { describe, expect, it } from "vitest";
import { joinPhone, phoneCountries, splitPhone } from "./phone";

describe("phone", () => {
  it("joins country and digits", () => {
    expect(joinPhone("IN", "9876543210")).toBe("+919876543210");
    expect(joinPhone("IN", "")).toBe("");
  });
  it("splits an international number", () => {
    expect(splitPhone("+919876543210")).toEqual({ country: "IN", digits: "9876543210" });
    expect(splitPhone("garbage")).toBeNull();
  });
  it("lists many countries with India first", () => {
    const list = phoneCountries();
    expect(list.length).toBeGreaterThan(200);
    expect(list[0]).toMatchObject({ code: "IN", dial: "91" });
  });
});