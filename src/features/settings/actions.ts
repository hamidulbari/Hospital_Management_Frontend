"use server";

import { z } from "zod";
import { apiFetch } from "@/lib/api/client";
import { fieldErrorsFromZod, invalidInput } from "@/lib/api/invalid";
import { failure, type ActionResult } from "@/lib/api/result";
import { getHospitalId } from "@/lib/hospital";
import { parseSettingsView, type SettingsView } from "./parse";

const keySchema = z.string().regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/, "Unknown setting.").max(80);
const valueSchema = z.union([z.string().max(1000, "Too long."), z.number(), z.boolean(), z.null()]);

const saveSchema = z.object({
  settings: z
    .record(keySchema, valueSchema)
    .refine((settings) => Object.keys(settings).length > 0 && Object.keys(settings).length <= 40, "Nothing to save."),
});

/**
 * PATCH the hospital's settings: { settings: { key: value } }. null resets a key to its default (and removes a secret).
 * Which keys exist and what they accept is the server's decision: it answers 422 with "settings.<key>" for a bad one.
 * A secret travels here once and is never sent back to the browser, kept, or logged.
 */
export async function saveSettingsAction(input: unknown): Promise<ActionResult<SettingsView>> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));

  const hospitalId = await getHospitalId();
  if (!hospitalId) return invalidInput({}, "No hospital was found for this account.");

  try {
    const body = await apiFetch<unknown>(`/organization/hospitals/${hospitalId}/settings`, {
      method: "PATCH",
      body: parsed.data,
      redirectOn401: false,
    });
    return { ok: true, data: parseSettingsView(body) };
  } catch (error) {
    return failure(error);
  }
}
