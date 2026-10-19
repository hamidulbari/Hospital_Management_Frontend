"use server";

import { apiFetch } from "@/lib/api/client";
import { fieldErrorsFromZod, invalidInput } from "@/lib/api/invalid";
import { failure, type ActionResult } from "@/lib/api/result";
import { idSchema } from "@/features/patients/schemas";
import { rec, str } from "@/lib/utils/guards";
import { createUserSchema, rolesSchema, statusSchema, updateUserSchema } from "./schemas";

const bad = (message: string) => invalidInput({}, message);

/** The password is temporary: the user must change it at the first sign-in. It is never logged or kept. */
export async function createUserAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  const { phone, ...rest } = parsed.data;
  try {
    const body = await apiFetch<unknown>("/identity/users", {
      method: "POST",
      body: phone ? { ...rest, phone } : rest,
      redirectOn401: false,
    });
    const id = str(rec(rec(body).data).id);
    if (!id) throw new Error("User answer had no id");
    return { ok: true, data: { id } };
  } catch (error) {
    return failure(error);
  }
}

export async function updateUserAction(userId: string, input: unknown): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(userId);
  const parsed = updateUserSchema.safeParse(input);
  if (!id.success) return bad("Unknown user.");
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  try {
    await apiFetch(`/identity/users/${id.data}`, {
      method: "PATCH",
      body: { full_name: parsed.data.full_name, phone: parsed.data.phone || null },
      redirectOn401: false,
    });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

/** Disabling signs the user out everywhere. You cannot disable yourself: the server refuses, its words are shown. */
export async function setUserStatusAction(userId: string, status: string): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(userId);
  const parsed = statusSchema.safeParse({ status });
  if (!id.success) return bad("Unknown user.");
  if (!parsed.success) return bad("Choose active or disabled.");
  try {
    await apiFetch(`/identity/users/${id.data}`, { method: "PATCH", body: parsed.data, redirectOn401: false });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

/** You cannot change your own roles and cannot hand out permissions you do not hold: the server decides. */
export async function setUserRolesAction(userId: string, input: unknown): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(userId);
  const parsed = rolesSchema.safeParse(input);
  if (!id.success) return bad("Unknown user.");
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  try {
    await apiFetch(`/identity/users/${id.data}/roles`, { method: "PUT", body: parsed.data, redirectOn401: false });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}