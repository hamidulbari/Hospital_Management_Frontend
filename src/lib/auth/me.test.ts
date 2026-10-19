import { describe, expect, it } from "vitest";
import { parseMe } from "./me";

describe("parseMe", () => {
  it("reads the real /identity/me shape", () => {
    expect(
      parseMe({
        data: { id: "01A", full_name: "Admin Name", email: "a@x.org", must_change_password: false, permissions: ["patient.view"] },
      }),
    ).toEqual({ id: "01A", name: "Admin Name", email: "a@x.org", mustChangePassword: false, permissions: ["patient.view"] });
  });
  it("falls back to the email, then to User", () => {
    expect(parseMe({ data: { id: "01A", email: "a@x.org" } }).name).toBe("a@x.org");
    expect(parseMe(null)).toEqual({ id: "", name: "User", email: "", mustChangePassword: false, permissions: [] });
  });
});