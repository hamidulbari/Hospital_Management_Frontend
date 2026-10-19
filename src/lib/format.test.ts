import { describe, expect, it } from "vitest";
import { humanize } from "./format";

describe("humanize", () => {
  it("turns codes into labels", () => {
    expect(humanize("data_sharing")).toBe("Data sharing");
    expect(humanize("")).toBe("");
  });
});