import { describe, expect, it } from "vitest";
import { amountInWords, integerToWordsIndian } from "./numbers-to-words";

describe("integerToWordsIndian", () => {
  it("writes numbers in the Indian system", () => {
    expect(integerToWordsIndian("0")).toBe("Zero");
    expect(integerToWordsIndian("21")).toBe("Twenty-One");
    expect(integerToWordsIndian("2124")).toBe("Two Thousand One Hundred Twenty-Four");
    expect(integerToWordsIndian("100000")).toBe("One Lakh");
    expect(integerToWordsIndian("12345678")).toBe("One Crore Twenty-Three Lakh Forty-Five Thousand Six Hundred Seventy-Eight");
  });
  it("refuses what it cannot write", () => {
    expect(integerToWordsIndian("12345678901")).toBe("");
    expect(integerToWordsIndian("abc")).toBe("");
  });
});

describe("amountInWords", () => {
  it("adds the currency name for INR", () => {
    expect(amountInWords("2124.00", "INR")).toBe("Two Thousand One Hundred Twenty-Four Rupees Only");
    expect(amountInWords("50.50", "INR")).toBe("Fifty Rupees and Fifty Paise Only");
    expect(amountInWords("0.00", "INR")).toBe("Zero Rupees Only");
  });
  it("stays plain for an unknown currency", () => {
    expect(amountInWords("2124.00")).toBe("Two Thousand One Hundred Twenty-Four Only");
    expect(amountInWords("10.25")).toBe("Ten and 25/100 Only");
  });
  it("returns nothing for something that is not an amount", () => {
    expect(amountInWords("")).toBe("");
    expect(amountInWords("12.5")).toBe("");
  });
});