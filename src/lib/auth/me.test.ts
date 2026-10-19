import { describe, expect, it } from "vitest";
import { parseMe } from "./me";

describe("parseMe", () => {
  it("reads the real /identity/me shape with the hospital block", () => {
    const me = parseMe({
      data: {
        id: "01A",
        full_name: "Admin Name",
        email: "a@x.org",
        must_change_password: false,
        permissions: ["patient.view"],
        hospital: { id: "h1", name: "City Hospital", timezone: "Asia/Kolkata", currency_code: "INR", date_format: "DD/MM/YYYY", locale: "en" },
      },
    });
    expect(me).toMatchObject({ id: "01A", name: "Admin Name", email: "a@x.org", mustChangePassword: false, permissions: ["patient.view"] });
    expect(me.hospital).toEqual({ id: "h1", name: "City Hospital", timezone: "Asia/Kolkata", currencyCode: "INR", dateFormat: "DD/MM/YYYY", locale: "en" });
  });
  it("has no hospital for a group-level user", () => {
    expect(parseMe({ data: { id: "01A", full_name: "Group User", hospital: null } }).hospital).toBeNull();
  });
  it("falls back to the email, then to User", () => {
    expect(parseMe({ data: { id: "01A", email: "a@x.org" } }).name).toBe("a@x.org");
    expect(parseMe(null)).toEqual({ id: "", name: "User", email: "", mustChangePassword: false, permissions: [], hospital: null });
  });
});
