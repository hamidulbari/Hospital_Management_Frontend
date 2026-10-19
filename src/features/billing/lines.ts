import { normalizeMoneyInput } from "@/lib/money";
import type { InvoiceLine } from "./parse";

export type LineDraft = {
  key: string;
  kind: "service" | "custom";
  serviceId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxPercent: string;
};

/** Money goes as a string with two decimals. The percentage is not money, so it is a number. */
export type ApiLine = {
  service_id?: string;
  description?: string;
  quantity: number;
  unit_price?: string;
  discount_amount?: string;
  tax_percent?: number;
};

export type LineField = "service" | "description" | "quantity" | "unitPrice" | "discount" | "taxPercent";
export type LineErrors = Record<number, Partial<Record<LineField, string>>>;
export type BuildResult = { ok: true; lines: ApiLine[] } | { ok: false; errors: LineErrors; message: string };

const INT_RE = /^\d+$/;
const PERCENT_RE = /^\d+(\.\d{1,2})?$/;

let counter = 0;
export function newKey(): string {
  counter += 1;
  return `line-${counter}`;
}

export function emptyLine(kind: "service" | "custom" = "service"): LineDraft {
  return { key: newKey(), kind, serviceId: "", description: "", quantity: "1", unitPrice: "", discount: "", taxPercent: "" };
}

/**
 * Checks what the person typed and builds the lines the API takes.
 * A price-list line sends only the service: the price comes from the list. Nothing is added up here.
 */
export function buildLines(drafts: LineDraft[], rules: { canDiscount: boolean }): BuildResult {
  const errors: LineErrors = {};
  const lines: ApiLine[] = [];
  const fail = (index: number, field: LineField, message: string) => {
    errors[index] = { ...errors[index], [field]: message };
  };

  drafts.forEach((draft, index) => {
    const quantityText = draft.quantity.trim();
    const quantity = INT_RE.test(quantityText) ? Number(quantityText) : NaN;
    if (!(quantity >= 1 && quantity <= 9999)) fail(index, "quantity", "Enter a whole number from 1 to 9999.");
    const line: ApiLine = { quantity };

    if (draft.kind === "service") {
      if (!draft.serviceId) fail(index, "service", "Choose a service.");
      else line.service_id = draft.serviceId;
    } else {
      const description = draft.description.trim();
      if (!description) fail(index, "description", "Describe the item.");
      else if (description.length > 200) fail(index, "description", "At most 200 characters.");
      else line.description = description;

      const price = normalizeMoneyInput(draft.unitPrice);
      if (price === null) fail(index, "unitPrice", "Enter a price like 250.00 (at most two decimals).");
      else line.unit_price = price;

      const tax = draft.taxPercent.trim();
      if (tax) {
        if (PERCENT_RE.test(tax)) line.tax_percent = Number(tax);
        else fail(index, "taxPercent", "Enter a percentage like 5 or 12.5.");
      }
    }

    if (rules.canDiscount && draft.discount.trim()) {
      const discount = normalizeMoneyInput(draft.discount);
      if (discount === null) fail(index, "discount", "Enter an amount like 50.00 (at most two decimals).");
      else if (discount !== "0.00") line.discount_amount = discount;
    }
    lines.push(line);
  });

  if (drafts.length === 0) return { ok: false, errors, message: "Add at least one line." };
  if (Object.keys(errors).length > 0) return { ok: false, errors, message: "Please correct the highlighted fields." };
  return { ok: true, lines };
}

/** Lines of a saved draft, back into the editor. */
export function linesToDrafts(lines: InvoiceLine[]): LineDraft[] {
  return lines.map((line) => {
    const custom = !line.serviceId;
    const hasDiscount = line.discount !== "" && !/^0+(\.0+)?$/.test(line.discount);
    return {
      key: newKey(),
      kind: custom ? "custom" : "service",
      serviceId: line.serviceId,
      description: custom ? line.description : "",
      quantity: line.quantity || "1",
      unitPrice: custom ? line.unitPrice : "",
      discount: hasDiscount ? line.discount : "",
      taxPercent: custom ? line.taxPercent : "",
    };
  });
}