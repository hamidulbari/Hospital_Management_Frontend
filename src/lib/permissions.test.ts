import { describe, expect, it } from "vitest";
import { can, canAll, canAny } from "./permissions";

const granted = ["patient.view", "appointment.book"];

describe("permissions", () => {
  it("checks one code", () => {
    expect(can(granted, "patient.view")).toBe(true);
    expect(can(granted, "billing.payment.reverse")).toBe(false);
  });
  it("checks any and all", () => {
    expect(canAny(granted, ["billing.invoice.view", "appointment.book"])).toBe(true);
    expect(canAny([], ["patient.view"])).toBe(false);
    expect(canAll(granted, ["patient.view", "appointment.book"])).toBe(true);
    expect(canAll(granted, ["patient.view", "patient.register"])).toBe(false);
  });
});