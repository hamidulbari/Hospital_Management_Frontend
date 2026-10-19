"use server";

import { apiFetch } from "@/lib/api/client";
import { fieldErrorsFromZod, invalidInput } from "@/lib/api/invalid";
import { failure, type ActionResult } from "@/lib/api/result";
import { idSchema } from "@/features/patients/schemas";
import { rec, str } from "@/lib/utils/guards";
import { normalizeMoneyInput } from "@/lib/money";
import {
  createInvoiceSchema,
  idempotencyKeySchema,
  linesSchema,
  paymentSchema,
  reasonSchema,
  serviceCreateSchema,
  serviceUpdateSchema,
} from "./schemas";

const bad = (message: string) => invalidInput({}, message);

export async function createInvoiceAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createInvoiceSchema.safeParse(input);
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  try {
    const body = await apiFetch<unknown>("/billing/invoices", { method: "POST", body: parsed.data, redirectOn401: false });
    const id = str(rec(rec(body).data).id);
    if (!id) throw new Error("Invoice answer had no id");
    return { ok: true, data: { id } };
  } catch (error) {
    return failure(error);
  }
}

export async function replaceLinesAction(invoiceId: string, input: unknown): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(invoiceId);
  const parsed = linesSchema.safeParse(input);
  if (!id.success) return bad("Unknown invoice.");
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  try {
    await apiFetch(`/billing/invoices/${id.data}/lines`, { method: "PUT", body: parsed.data, redirectOn401: false });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function issueInvoiceAction(invoiceId: string): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(invoiceId);
  if (!id.success) return bad("Unknown invoice.");
  try {
    await apiFetch(`/billing/invoices/${id.data}/issue`, { method: "POST", redirectOn401: false });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

/** Only a draft can be deleted. The server refuses anything else. */
export async function deleteDraftAction(invoiceId: string): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(invoiceId);
  if (!id.success) return bad("Unknown invoice.");
  try {
    await apiFetch(`/billing/invoices/${id.data}`, { method: "DELETE", redirectOn401: false });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function cancelInvoiceAction(invoiceId: string, input: unknown): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(invoiceId);
  const parsed = reasonSchema.safeParse(input);
  if (!id.success) return bad("Unknown invoice.");
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  try {
    await apiFetch(`/billing/invoices/${id.data}/cancel`, { method: "POST", body: parsed.data, redirectOn401: false });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function recordPaymentAction(invoiceId: string, input: unknown, idempotencyKey: string): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(invoiceId);
  const key = idempotencyKeySchema.safeParse(idempotencyKey);
  const parsed = paymentSchema.safeParse(input);
  if (!id.success) return bad("Unknown invoice.");
  if (!key.success) return bad("This payment could not be sent safely. Reload the page and try again.");
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));

  const { amount, method, reference } = parsed.data;
  try {
    await apiFetch(`/billing/invoices/${id.data}/payments`, {
      method: "POST",
      body: { amount: normalizeMoneyInput(amount) ?? amount, method, ...(reference ? { reference } : {}) },
      idempotencyKey: key.data,
      redirectOn401: false,
    });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function reversePaymentAction(paymentId: string, input: unknown, idempotencyKey: string): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(paymentId);
  const key = idempotencyKeySchema.safeParse(idempotencyKey);
  const parsed = reasonSchema.safeParse(input);
  if (!id.success) return bad("Unknown payment.");
  if (!key.success) return bad("This request could not be sent safely. Reload the page and try again.");
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  try {
    await apiFetch(`/billing/payments/${id.data}/reverse`, {
      method: "POST",
      body: parsed.data,
      idempotencyKey: key.data,
      redirectOn401: false,
    });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function createServiceAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = serviceCreateSchema.safeParse(input);
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  const { tax_percent, unit_price, ...rest } = parsed.data;
  try {
    await apiFetch("/billing/services", {
      method: "POST",
      body: { ...rest, unit_price: normalizeMoneyInput(unit_price) ?? unit_price, ...(tax_percent ? { tax_percent: Number(tax_percent) } : {}) },
      redirectOn401: false,
    });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function updateServiceAction(serviceId: string, input: unknown): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(serviceId);
  const parsed = serviceUpdateSchema.safeParse(input);
  if (!id.success) return bad("Unknown service.");
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  const { tax_percent, unit_price, ...rest } = parsed.data;
  try {
    await apiFetch(`/billing/services/${id.data}`, {
      method: "PATCH",
      body: { ...rest, unit_price: normalizeMoneyInput(unit_price) ?? unit_price, ...(tax_percent ? { tax_percent: Number(tax_percent) } : {}) },
      redirectOn401: false,
    });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}