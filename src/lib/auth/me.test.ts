import { describe, expect, it } from "vitest";
import { parseMe } from "./me";

// These tests only prove the parser copes with the shapes I ASSUMED. Real shape: see STATUS.md.
describe("parseMe", () => {
  it("reads a nested user", () => {
    expect(
      parseMe({ data: { user: { id: "01A", name: "Asha", email: "a@x.org" }, must_change_password: true, permissions: ["patient.view"] } }),
    ).toEqual({ id: "01A", name: "Asha", email: "a@x.org", mustChangePassword: true, permissions: ["patient.view"] });
  });
  it("reads a flat user", () => {
    expect(parseMe({ data: { id: "01A", email: "a@x.org", permissions: ["patient.view"] } })).toMatchObject({
      name: "a@x.org",
      mustChangePassword: false,
      permissions: ["patient.view"],
    });
  });
  it("never throws on garbage", () => {
    expect(parseMe(null)).toEqual({ id: "", name: "User", email: "", mustChangePassword: false, permissions: [] });
  });
});