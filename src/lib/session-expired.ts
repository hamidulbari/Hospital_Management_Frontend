import type { ClientError } from "@/lib/api/errors";

/** Returns true when the session is over and the browser is being sent to sign in again. */
export function redirectIfExpired(error: ClientError): boolean {
  if (error.code !== "unauthenticated") return false;
  window.location.assign("/api/auth/session-expired");
  return true;
}