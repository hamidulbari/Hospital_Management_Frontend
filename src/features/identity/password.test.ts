import { describe, expect, it } from "vitest";
import { generatePassword, type RandomInt } from "./password";

function seeded(seed: number): RandomInt {
  let state = seed;
  return (max) => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state % max;
  };
}

describe("generatePassword", () => {
  it("has every kind of character and the asked length", () => {
    const password = generatePassword(16, seeded(7));
    expect(password).toHaveLength(16);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[0-9]/);
    expect(password).toMatch(/[!@#%*\-_=+?]/);
  });
  it("is never shorter than 12 characters", () => {
    expect(generatePassword(4, seeded(3))).toHaveLength(12);
  });
  it("leaves out look-alike characters", () => {
    for (let seed = 1; seed <= 20; seed++) expect(generatePassword(32, seeded(seed))).not.toMatch(/[Il1O0]/);
  });
  it("is different each time with the real generator", () => {
    expect(generatePassword()).not.toBe(generatePassword());
  });
});