import { describe, expect, it } from "vitest";
import { displayRole, groupPermissions, parsePermissions, parseRoles, parseUser, parseUserList } from "./parse";

describe("identity parsers", () => {
  it("reads a user with roles", () => {
    const u = parseUser({ data: { id: "u1", full_name: "Asha Rao", email: "a@x.org", status: "active", must_change_password: true, roles: [{ id: "r1", name: "doctor" }, "nurse"] } });
    expect(u).toMatchObject({ name: "Asha Rao", email: "a@x.org", status: "active", mustChangePassword: true });
    expect(u.roles).toEqual([{ id: "r1", name: "doctor" }, { id: "", name: "nurse" }]);
  });
  it("reads a list and never throws", () => {
    expect(parseUserList({ data: [{ id: "u1", full_name: "A" }], meta: { current_page: 2, last_page: 3, total: 55 } })).toMatchObject({ currentPage: 2, lastPage: 3, total: 55 });
    expect(parseUser(null).roles).toEqual([]);
  });
  it("reads roles with permission codes as text or objects", () => {
    const roles = parseRoles({ data: [{ id: "r1", name: "doctor", permissions: ["patient.view", { code: "appointment.view" }] }] });
    expect(roles[0].permissions).toEqual(["patient.view", "appointment.view"]);
    expect(parsePermissions({ data: ["patient.view", { code: "x.y", description: "Does y" }] })).toEqual([
      { code: "patient.view", description: "" },
      { code: "x.y", description: "Does y" },
    ]);
  });
  it("writes role names readably and groups permissions", () => {
    expect(displayRole("org_admin")).toBe("Org admin");
    expect(displayRole("Doctor")).toBe("Doctor");
    expect(groupPermissions(["patient.view", "billing.invoice.view", "patient.register"])).toEqual([
      { module: "billing", codes: ["billing.invoice.view"] },
      { module: "patient", codes: ["patient.register", "patient.view"] },
    ]);
  });
});