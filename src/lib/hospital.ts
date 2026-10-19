import "server-only";
import { cache } from "react";
import { apiLoad } from "@/lib/api/load";
import { localTodayIso } from "@/lib/calendar";
import { localParts } from "@/lib/datetime";
import { list, rec, str } from "@/lib/utils/guards";

export type HospitalContext = { name: string; timezone: string; currencyCode: string };

/** From GET /organization/hospitals (real shape confirmed). Users without organization.hospital.view get null. */
export const getHospital = cache(async (): Promise<HospitalContext | null> => {
  const result = await apiLoad<unknown>("/organization/hospitals", { query: { per_page: 1 } });
  if (!result.ok) return null;
  const first = rec(list(rec(result.data).data)[0]);
  const timezone = str(first.timezone);
  if (!timezone) return null;
  return { name: str(first.name), timezone, currencyCode: str(first.currency_code) };
});

/** Today and the time now in the hospital's timezone. Falls back to this computer's clock when the profile is not readable. */
export async function hospitalNow(): Promise<{ today: string; time: string; timezone: string | null }> {
  const hospital = await getHospital();
  const parts = hospital ? localParts(new Date(), hospital.timezone) : null;
  if (hospital && parts) return { today: parts.date, time: parts.time, timezone: hospital.timezone };

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return { today: localTodayIso(now), time: `${pad(now.getHours())}:${pad(now.getMinutes())}`, timezone: null };
}