import { describe, expect, it } from "vitest";
import { readInvoiceFilters } from "./filters";

const statuses = ["draft", "issued"];

describe("readInvoiceFilters", () => {
  it("has no day by default (newest invoices) and drops invalid values", () => {
    expect(readInvoiceFilters({}, statuses)).toEqual({ date: "", status: "", page: 1 });
    expect(readInvoiceFilters({ date: "nope", status: "x", page: "0" }, statuses)).toEqual({ date: "", status: "", page: 1 });
  });
  it("keeps valid values", () => {
    expect(readInvoiceFilters({ date: "2026-10-19", status: "draft", page: "3" }, statuses)).toEqual({ date: "2026-10-19", status: "draft", page: 3 });
  });
});
