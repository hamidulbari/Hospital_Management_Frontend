import { describe, expect, it } from "vitest";
import { sectionFor } from "./sections";

describe("sectionFor", () => {
  it("names the part of the app from the first segment", () => {
    expect(sectionFor("/")).toBe("dashboard");
    expect(sectionFor("/patients")).toBe("patients");
    expect(sectionFor("/patients/01m59qf0j57gndns5818ahgraf")).toBe("patients");
    expect(sectionFor("/appointments/queue")).toBe("appointments");
    expect(sectionFor("/consultation/abc")).toBe("consultation");
    expect(sectionFor("/billing/statement")).toBe("billing");
    expect(sectionFor("/admin/practitioners")).toBe("admin");
  });
  it("gives Settings its own colour, for every tab of it", () => {
    expect(sectionFor("/settings")).toBe("settings");
    expect(sectionFor("/settings/email")).toBe("settings");
    expect(sectionFor("/settings/whatsapp")).toBe("settings");
  });
  it("falls back to the dashboard", () => {
    expect(sectionFor("/change-password")).toBe("dashboard");
    expect(sectionFor("")).toBe("dashboard");
  });
});
