"use server";

import { apiFetch } from "@/lib/api/client";
import { failure, type ActionResult } from "@/lib/api/result";
import { changePasswordRequestSchema } from "./schemas";

export async function changePasswordAction(input: {
  current_password: string;
  password: string;
}): Promise<ActionResult<null>> {
  const parsed = changePasswordRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        status: 422,
        code: "validation_failed",
        message: "Please correct the highlighted fields.",
        serverMessage: "",
        fieldErrors: {},
        correlationId: null,
        unexpected: false,
      },
    };
  }

  try {
    await apiFetch("/identity/change-password", { method: "POST", body: parsed.data, redirectOn401: false });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}