import { toClientError, type ClientError } from "./errors";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ClientError };

/** redirect() and notFound() work by throwing: never swallow them. */
export function isNextControlFlowError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("digest" in error)) return false;
  const digest = (error as { digest: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_");
}

export function failure(error: unknown): { ok: false; error: ClientError } {
  if (isNextControlFlowError(error)) throw error;
  return { ok: false, error: toClientError(error) };
}