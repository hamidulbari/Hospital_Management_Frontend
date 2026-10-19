import type { z } from "zod";
import type { ClientError, FieldErrors } from "./errors";

export function fieldErrorsFromZod(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

export function invalidInput(
  fieldErrors: FieldErrors = {},
  message = "Please correct the highlighted fields.",
): { ok: false; error: ClientError } {
  return {
    ok: false,
    error: { status: 422, code: "validation_failed", message, serverMessage: "", fieldErrors, correlationId: null, unexpected: false },
  };
}