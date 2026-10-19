"use server";

import { apiFetch } from "@/lib/api/client";
import { toClientError } from "@/lib/api/errors";
import { fieldErrorsFromZod, invalidInput } from "@/lib/api/invalid";
import { failure, type ActionResult } from "@/lib/api/result";
import { idSchema } from "@/features/patients/schemas";
import { rec, str } from "@/lib/utils/guards";
import { parseVersions, type NoteVersion } from "./parse";
import { amendSchema, createNoteSchema, diagnosisSchema, draftBodySchema, vitalReasonSchema, vitalsSchema } from "./schemas";

const bad = (message: string) => invalidInput({}, message);

/** Opens the encounter for a checked-in appointment, then marks the appointment as started. */
export async function startConsultationAction(
  appointmentId: string,
): Promise<ActionResult<{ encounterId: string; warning: string | null }>> {
  const id = idSchema.safeParse(appointmentId);
  if (!id.success) return bad("Unknown appointment.");

  try {
    const created = await apiFetch<unknown>("/encounters", {
      method: "POST",
      body: { appointment_id: id.data, encounter_type: "opd" },
      redirectOn401: false,
    });
    const encounterId = str(rec(rec(created).data).id);
    if (!encounterId) throw new Error("Encounter answer had no id");

    let warning: string | null = null;
    try {
      await apiFetch(`/appointments/${id.data}/start`, { method: "POST", redirectOn401: false });
    } catch (error) {
      warning = toClientError(error).message;
    }
    return { ok: true, data: { encounterId, warning } };
  } catch (error) {
    return failure(error);
  }
}

export async function createNoteAction(encounterId: string, input: unknown): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(encounterId);
  const parsed = createNoteSchema.safeParse(input);
  if (!id.success) return bad("Unknown encounter.");
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  try {
    await apiFetch(`/encounters/${id.data}/notes`, { method: "POST", body: parsed.data, redirectOn401: false });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function saveDraftAction(noteId: string, input: unknown): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(noteId);
  const parsed = draftBodySchema.safeParse(input);
  if (!id.success) return bad("Unknown note.");
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  try {
    await apiFetch(`/notes/${id.data}`, { method: "PATCH", body: parsed.data, redirectOn401: false });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function signNoteAction(noteId: string): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(noteId);
  if (!id.success) return bad("Unknown note.");
  try {
    await apiFetch(`/notes/${id.data}/sign`, { method: "POST", redirectOn401: false });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteNoteAction(noteId: string): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(noteId);
  if (!id.success) return bad("Unknown note.");
  try {
    await apiFetch(`/notes/${id.data}`, { method: "DELETE", redirectOn401: false });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function amendNoteAction(noteId: string, input: unknown): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(noteId);
  const parsed = amendSchema.safeParse(input);
  if (!id.success) return bad("Unknown note.");
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  const { reason, body } = parsed.data;
  try {
    await apiFetch(`/notes/${id.data}/amend`, {
      method: "POST",
      body: body && body.trim() ? { reason, body } : { reason },
      redirectOn401: false,
    });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

/** An audited read: only called when the user opens the history. */
export async function loadVersionsAction(noteId: string): Promise<ActionResult<NoteVersion[]>> {
  const id = idSchema.safeParse(noteId);
  if (!id.success) return bad("Unknown note.");
  try {
    const body = await apiFetch<unknown>(`/notes/${id.data}/versions`, { redirectOn401: false });
    return { ok: true, data: parseVersions(body) };
  } catch (error) {
    return failure(error);
  }
}

export async function recordVitalsAction(encounterId: string, input: unknown): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(encounterId);
  const parsed = vitalsSchema.safeParse(input);
  if (!id.success) return bad("Unknown encounter.");
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  try {
    await apiFetch(`/encounters/${id.data}/observations`, { method: "POST", body: parsed.data, redirectOn401: false });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function markVitalErrorAction(encounterId: string, observationId: string, input: unknown): Promise<ActionResult<null>> {
  const encounter = idSchema.safeParse(encounterId);
  const observation = idSchema.safeParse(observationId);
  const parsed = vitalReasonSchema.safeParse(input);
  if (!encounter.success || !observation.success) return bad("Unknown measurement.");
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  try {
    await apiFetch(`/encounters/${encounter.data}/observations/${observation.data}/entered-in-error`, {
      method: "POST",
      body: parsed.data,
      redirectOn401: false,
    });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function addDiagnosisAction(encounterId: string, input: unknown): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(encounterId);
  const parsed = diagnosisSchema.safeParse(input);
  if (!id.success) return bad("Unknown encounter.");
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  const { code, ...rest } = parsed.data;
  try {
    await apiFetch(`/encounters/${id.data}/diagnoses`, {
      method: "POST",
      body: code ? { ...rest, code } : rest,
      redirectOn401: false,
    });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function markDiagnosisErrorAction(diagnosisId: string): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(diagnosisId);
  if (!id.success) return bad("Unknown diagnosis.");
  try {
    await apiFetch(`/diagnoses/${id.data}/entered-in-error`, { method: "POST", redirectOn401: false });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

/** Finishes the encounter. When the appointment is known, it is then marked completed so the OPD queue moves. */
export async function finishEncounterAction(
  encounterId: string,
  appointmentId: string,
): Promise<ActionResult<{ warning: string | null }>> {
  const id = idSchema.safeParse(encounterId);
  if (!id.success) return bad("Unknown encounter.");
  try {
    await apiFetch(`/encounters/${id.data}/finish`, { method: "POST", redirectOn401: false });
  } catch (error) {
    return failure(error);
  }

  const appointment = idSchema.safeParse(appointmentId);
  if (!appointment.success) return { ok: true, data: { warning: null } };
  try {
    await apiFetch(`/appointments/${appointment.data}/complete`, { method: "POST", redirectOn401: false });
    return { ok: true, data: { warning: null } };
  } catch (error) {
    return { ok: true, data: { warning: toClientError(error).message } };
  }
}