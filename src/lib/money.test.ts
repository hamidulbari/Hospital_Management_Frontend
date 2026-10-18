import { describe, expect, it } from "vitest";
import { formatMoney, normalizeMoneyInput } from "./money";

describe("formatMoney", () => {
  it("keeps the server string and groups thousands", () => {
    expect(formatMoney("922.00")).toBe("922.00");
    expect(formatMoney("1234567.00")).toBe("1,234,567.00");
  });
  it("supports Indian grouping and a currency code", () => {
    expect(formatMoney("1234567.00", { grouping: "indian" })).toBe("12,34,567.00");
    expect(formatMoney("922.00", { currency: "INR" })).toBe("INR 922.00");
  });
  it("handles negatives", () => {
    expect(formatMoney("-1500.00")).toBe("-1,500.00");
    expect(formatMoney("-1500.00", { currency: "INR" })).toBe("-INR 1,500.00");
  });
  it("returns unknown shapes unchanged", () => {
    expect(formatMoney("abc")).toBe("abc");
    expect(formatMoney("12.5")).toBe("12.5");
  });
});

describe("normalizeMoneyInput", () => {
  it("pads to two decimals", () => {
    expect(normalizeMoneyInput("12")).toBe("12.00");
    expect(normalizeMoneyInput("12.5")).toBe("12.50");
    expect(normalizeMoneyInput(" 0 ")).toBe("0.00");
  });
  it("refuses more than two decimals and junk", () => {
    expect(normalizeMoneyInput("12.345")).toBeNull();
    expect(normalizeMoneyInput("1,000")).toBeNull();
    expect(normalizeMoneyInput("-5")).toBeNull();
    expect(normalizeMoneyInput("")).toBeNull();
    expect(normalizeMoneyInput(".5")).toBeNull();
  });
});