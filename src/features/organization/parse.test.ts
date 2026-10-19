import { describe, expect, it } from "vitest";
import { isValidTimeZone, timezoneOptions } from "./timezones";
import { parseBranches, parseDepartments, parseHospital } from "./parse";

describe("organization parsers", () => {
  it("reads the real hospital shape", () => {
    const h = parseHospital({
      data: [{ id: "h1", code: "CITY01", name: "City Hospital", address: { line1: null, city: "Pune", pincode: "411001", country_code: "IN" }, timezone: "Asia/Qatar", currency_code: "INR", date_format: "DD/MM/YYYY", default_locale: "en", status: "active" }],
    });
    expect(h).toMatchObject({ name: "City Hospital", city: "Pune", pincode: "411001", currencyCode: "INR", timezone: "Asia/Qatar", line1: "" });
    expect(parseHospital({ data: [] })).toBeNull();
    expect(parseHospital(null)).toBeNull();
  });
  it("reads branches with a flat or a nested address", () => {
    const { items } = parseBranches({ data: [{ id: "b1", code: "MAIN", name: "Main", is_main: true, status: "active", address_line1: "1 Road", city: "Pune" }, { id: "b2", code: "N", name: "North", address: { city: "Delhi" } }] });
    expect(items[0]).toMatchObject({ isMain: true, line1: "1 Road", city: "Pune" });
    expect(items[1].city).toBe("Delhi");
  });
  it("reads departments with branch and parent", () => {
    const { items } = parseDepartments({ data: [{ id: "d1", code: "OPD", name: "OPD", type: "clinical", status: "active", branch: { id: "b1", name: "Main" }, parent_id: "d0" }] });
    expect(items[0]).toMatchObject({ branchId: "b1", branchName: "Main", parentId: "d0" });
  });
});

describe("timezones", () => {
  it("keeps the current zone in the list and checks names", () => {
    expect(timezoneOptions("Asia/Qatar").some((o) => o.value === "Asia/Qatar")).toBe(true);
    expect(timezoneOptions("Mars/Base").some((o) => o.value === "Mars/Base")).toBe(true);
    expect(isValidTimeZone("Asia/Kolkata")).toBe(true);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
  });
});