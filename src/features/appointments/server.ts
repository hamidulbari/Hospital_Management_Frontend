import "server-only";
import { apiLoad } from "@/lib/api/load";
import type { ClientError } from "@/lib/api/errors";
import { parsePractitioners, type PractitionerOption } from "./parse";

/** Active practitioners for the doctor pickers. Needs practitioner.view. */
export async function loadPractitioners(): Promise<{ list: PractitionerOption[]; error: ClientError | null }> {
  const result = await apiLoad<unknown>("/practitioners", { query: { status: "active", per_page: 100 } });
  if (!result.ok) return { list: [], error: result.error };
  return { list: parsePractitioners(result.data), error: null };
}