import "server-only";
import { apiLoad, type LoadResult } from "@/lib/api/load";
import { parseDashboard, type Dashboard } from "./parse";

/** GET /dashboard/summary: counts and totals only, no patient data. Loaded once per visit, never polled. */
export async function loadDashboard(): Promise<LoadResult<Dashboard>> {
  const result = await apiLoad<unknown>("/dashboard/summary");
  return result.ok ? { ok: true, data: parseDashboard(result.data) } : result;
}
