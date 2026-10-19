import { describe, expect, it } from "vitest";
import { crumbsFor } from "./breadcrumbs";

const labels = (path: string) => crumbsFor(path).map((c) => c.label);

describe("crumbsFor", () => {
  it("has none on the dashboard", () => {
    expect(crumbsFor("/")).toEqual([]);
  });
  it("builds the trail from the path", () => {
    expect(labels("/patients")).toEqual(["Dashboard", "Patients"]);
    expect(labels("/appointments/queue")).toEqual(["Dashboard", "Appointments", "OPD queue"]);
    expect(labels("/appointments/walk-in")).toEqual(["Dashboard", "Appointments", "Walk-in"]);
  });
  it("names an id by its parent, never by a patient", () => {
    expect(labels("/patients/01m59qf0j57gndns5818ahgraf")).toEqual(["Dashboard", "Patients", "Patient record"]);
  });
  it("makes unknown segments readable", () => {
    expect(labels("/reports/daily-summary")).toEqual(["Dashboard", "Reports", "Daily summary"]);
  });
  it("links every crumb to its own path", () => {
    expect(crumbsFor("/appointments/new").map((c) => c.href)).toEqual(["/", "/appointments", "/appointments/new"]);
  });
});