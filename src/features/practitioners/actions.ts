"use server";

import { apiFetch } from "@/lib/api/client";
import { toClientError } from "@/lib/api/errors";
import { fieldErrorsFromZod, invalidInput } from "@/lib/api/invalid";
import { failure, type ActionResult } from "@/lib/api/result";
import { idSchema } from "@/features/patients/schemas";
import { rec, str } from "@/lib/utils/guards";
import {
  credentialSchema,
  exceptionSchema,
  newSpecializationSchema,
  practitionerCreateSchema,
  practitionerUpdateSchema,
  rulesSchema,
  specializationsSchema,
  verifySchema,
} from "./schemas";

const bad = (message: string) => invalidInput({}, message);
const only = (entries: Record<string, string | undefined>) => Object.fromEntries(Object.entries(entries).filter(([, v]) => v !== undefined && v !== ""));

export async function createPractitionerAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = practitionerCreateSchema.safeParse(input);
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  const v = parsed.data;
  try {
    const body = await apiFetch<unknown>("/practitioners", {
      method: "POST",
      body: { full_name: v.full_name, practitioner_type: v.practitioner_type, ...only({ primary_department_id: v.primary_department_id, user_id: v.user_id, joined_on: v.joined_on }) },
      redirectOn401: false,
    });
    const id = str(rec(rec(body).data).id);
    if (!id) throw new Error("Practitioner answer had no id");
    return { ok: true, data: { id } };
  } catch (error) {
    return failure(error);
  }
}

export async function updatePractitionerAction(practitionerId: string, input: unknown): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(practitionerId);
  const parsed = practitionerUpdateSchema.safeParse(input);
  if (!id.success) return bad("Unknown practitioner.");
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  const v = parsed.data;
  try {
    await apiFetch(`/practitioners/${id.data}`, {
      method: "PATCH",
      body: {
        full_name: v.full_name,
        status: v.status,
        joined_on: v.joined_on || null,
        left_on: v.left_on || null,
        ...(v.primary_department_id === undefined ? {} : { primary_department_id: v.primary_department_id || null }),
      },
      redirectOn401: false,
    });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function createSpecializationAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = newSpecializationSchema.safeParse(input);
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  try {
    await apiFetch("/specializations", { method: "POST", body: parsed.data, redirectOn401: false });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function setSpecializationsAction(practitionerId: string, input: unknown): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(practitionerId);
  const parsed = specializationsSchema.safeParse(input);
  if (!id.success) return bad("Unknown practitioner.");
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  try {
    await apiFetch(`/practitioners/${id.data}/specializations`, { method: "PUT", body: parsed.data, redirectOn401: false });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function addCredentialAction(practitionerId: string, input: unknown): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(practitionerId);
  const parsed = credentialSchema.safeParse(input);
  if (!id.success) return bad("Unknown practitioner.");
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  const v = parsed.data;
  try {
    await apiFetch(`/practitioners/${id.data}/credentials`, {
      method: "POST",
      body: { credential_type: v.credential_type, registration_number: v.registration_number, issuing_body: v.issuing_body, ...only({ issued_on: v.issued_on, expires_on: v.expires_on }) },
      redirectOn401: false,
    });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

/** Nobody can verify their own credential, and a credential is reviewed once: the server decides, its words are shown. */
export async function verifyCredentialAction(practitionerId: string, credentialId: string, input: unknown): Promise<ActionResult<null>> {
  const practitioner = idSchema.safeParse(practitionerId);
  const credential = idSchema.safeParse(credentialId);
  const parsed = verifySchema.safeParse(input);
  if (!practitioner.success || !credential.success) return bad("Unknown credential.");
  if (!parsed.success) return bad("Choose verified or rejected.");
  try {
    await apiFetch(`/practitioners/${practitioner.data}/credentials/${credential.data}/verify`, { method: "POST", body: parsed.data, redirectOn401: false });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export type AddRulesResult = { added: number; failed: { weekday: number; message: string }[] };

/** One rule per chosen weekday. A refused day is reported, the others still go through. */
export async function addRulesAction(practitionerId: string, input: unknown): Promise<ActionResult<AddRulesResult>> {
  const id = idSchema.safeParse(practitionerId);
  const parsed = rulesSchema.safeParse(input);
  if (!id.success) return bad("Unknown practitioner.");
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  const v = parsed.data;

  const result: AddRulesResult = { added: 0, failed: [] };
  for (const weekday of v.weekdays) {
    try {
      await apiFetch(`/practitioners/${id.data}/availability-rules`, {
        method: "POST",
        body: { weekday, start_time: v.start_time, end_time: v.end_time, slot_minutes: v.slot_minutes, ...only({ valid_from: v.valid_from, valid_until: v.valid_until }) },
        redirectOn401: false,
      });
      result.added += 1;
    } catch (error) {
      const client = toClientError(error);
      if (client.code === "unauthenticated" || client.status === 0) return failure(error);
      result.failed.push({ weekday, message: Object.values(client.fieldErrors)[0] ?? client.message });
    }
  }
  return { ok: true, data: result };
}

export async function deleteRuleAction(practitionerId: string, ruleId: string): Promise<ActionResult<null>> {
  const practitioner = idSchema.safeParse(practitionerId);
  const rule = idSchema.safeParse(ruleId);
  if (!practitioner.success || !rule.success) return bad("Unknown rule.");
  try {
    await apiFetch(`/practitioners/${practitioner.data}/availability-rules/${rule.data}`, { method: "DELETE", redirectOn401: false });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function addExceptionAction(practitionerId: string, input: unknown): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(practitionerId);
  const parsed = exceptionSchema.safeParse(input);
  if (!id.success) return bad("Unknown practitioner.");
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  const v = parsed.data;
  try {
    await apiFetch(`/practitioners/${id.data}/availability-exceptions`, {
      method: "POST",
      body: { exception_date: v.exception_date, kind: v.kind, ...only({ start_time: v.start_time, end_time: v.end_time, reason: v.reason }) },
      redirectOn401: false,
    });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteExceptionAction(practitionerId: string, exceptionId: string): Promise<ActionResult<null>> {
  const practitioner = idSchema.safeParse(practitionerId);
  const exception = idSchema.safeParse(exceptionId);
  if (!practitioner.success || !exception.success) return bad("Unknown entry.");
  try {
    await apiFetch(`/practitioners/${practitioner.data}/availability-exceptions/${exception.data}`, { method: "DELETE", redirectOn401: false });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}