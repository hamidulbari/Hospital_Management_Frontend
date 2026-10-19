"use server";

import { apiFetch } from "@/lib/api/client";
import { fieldErrorsFromZod, invalidInput } from "@/lib/api/invalid";
import { failure, type ActionResult } from "@/lib/api/result";
import { idSchema } from "@/features/patients/schemas";
import { rec, str } from "@/lib/utils/guards";
import { parseSlots, tokenOf, type SlotDay } from "./parse";
import { bookRequestSchema, reasonSchema, rescheduleSchema, slotQuerySchema } from "./schemas";

export async function loadSlotsAction(input: unknown): Promise<ActionResult<SlotDay[]>> {
  const parsed = slotQuerySchema.safeParse(input);
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));

  try {
    const body = await apiFetch<unknown>("/appointment-slots", {
      query: { practitioner: parsed.data.practitioner_id, from: parsed.data.from, to: parsed.data.to },
      redirectOn401: false,
    });
    return { ok: true, data: parseSlots(body, parsed.data.timezone ?? null) };
  } catch (error) {
    return failure(error);
  }
}

export async function bookAppointmentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = bookRequestSchema.safeParse(input);
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));

  const { reason, ...rest } = parsed.data;
  try {
    const body = await apiFetch<unknown>("/appointments", {
      method: "POST",
      body: reason ? { ...rest, reason } : rest,
      redirectOn401: false,
    });
    return { ok: true, data: { id: str(rec(rec(body).data).id) } };
  } catch (error) {
    return failure(error);
  }
}

export async function cancelAppointmentAction(appointmentId: string, input: unknown): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(appointmentId);
  const parsed = reasonSchema.safeParse(input);
  if (!id.success) return invalidInput({}, "Unknown appointment.");
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));

  try {
    await apiFetch(`/appointments/${id.data}/cancel`, { method: "POST", body: parsed.data, redirectOn401: false });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function rescheduleAppointmentAction(appointmentId: string, input: unknown): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(appointmentId);
  const parsed = rescheduleSchema.safeParse(input);
  if (!id.success) return invalidInput({}, "Unknown appointment.");
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));

  try {
    await apiFetch(`/appointments/${id.data}/reschedule`, { method: "POST", body: parsed.data, redirectOn401: false });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function checkInAppointmentAction(appointmentId: string): Promise<ActionResult<{ token: string | null }>> {
  const id = idSchema.safeParse(appointmentId);
  if (!id.success) return invalidInput({}, "Unknown appointment.");

  try {
    const body = await apiFetch<unknown>(`/appointments/${id.data}/check-in`, { method: "POST", redirectOn401: false });
    return { ok: true, data: { token: tokenOf(rec(body).data) } };
  } catch (error) {
    return failure(error);
  }
}

export async function markNoShowAction(appointmentId: string): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(appointmentId);
  if (!id.success) return invalidInput({}, "Unknown appointment.");

  try {
    await apiFetch(`/appointments/${id.data}/no-show`, { method: "POST", redirectOn401: false });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}