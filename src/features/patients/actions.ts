"use server";

import { apiFetch } from "@/lib/api/client";
import { fieldErrorsFromZod, invalidInput } from "@/lib/api/invalid";
import { failure, type ActionResult } from "@/lib/api/result";
import { rec, str } from "@/lib/utils/guards";
import { PATIENTS_PAGE_SIZE } from "./limits";
import { buildRegisterBody } from "./payload";
import { parsePatientList, type PatientSearchResult } from "./parse";
import { consentFormSchema, idSchema, registerFormSchema, searchRequestSchema } from "./schemas";

export async function searchPatientsAction(input: unknown): Promise<ActionResult<PatientSearchResult>> {
  const parsed = searchRequestSchema.safeParse(input);
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  const { name, phone, mrn, date_of_birth, page } = parsed.data;

  try {
    const body = await apiFetch<unknown>("/patients", {
      query: { name, phone, mrn, date_of_birth, page, per_page: PATIENTS_PAGE_SIZE },
      redirectOn401: false,
    });
    return { ok: true, data: parsePatientList(body) };
  } catch (error) {
    return failure(error);
  }
}

export async function registerPatientAction(input: unknown, acknowledgeDuplicates: boolean): Promise<ActionResult<{ id: string }>> {
  const parsed = registerFormSchema.safeParse(input);
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));

  try {
    const body = await apiFetch<unknown>("/patients", {
      method: "POST",
      body: buildRegisterBody(parsed.data, acknowledgeDuplicates === true),
      redirectOn401: false,
    });
    const id = str(rec(rec(body).data).id);
    if (!id) throw new Error("Register answer had no id");
    return { ok: true, data: { id } };
  } catch (error) {
    return failure(error);
  }
}

export async function recordConsentAction(patientId: string, input: unknown): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(patientId);
  const parsed = consentFormSchema.safeParse(input);
  if (!id.success) return invalidInput({}, "Unknown patient.");
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));

  try {
    await apiFetch(`/patients/${id.data}/consents`, { method: "POST", body: parsed.data, redirectOn401: false });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function withdrawConsentAction(patientId: string, consentId: string): Promise<ActionResult<null>> {
  const patient = idSchema.safeParse(patientId);
  const consent = idSchema.safeParse(consentId);
  if (!patient.success || !consent.success) return invalidInput({}, "Unknown consent.");

  try {
    await apiFetch(`/patients/${patient.data}/consents/${consent.data}/withdraw`, { method: "POST", redirectOn401: false });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}