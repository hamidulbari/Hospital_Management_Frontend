import "server-only";
import { cache } from "react";
import { apiLoad } from "@/lib/api/load";
import { getSession } from "@/lib/auth/session";
import { localTodayIso } from "@/lib/calendar";
import { localParts } from "@/lib/datetime";
import { list, rec, str, strOrNull } from "@/lib/utils/guards";

export type HospitalContext = {
  name: string;
  timezone: string;
  currencyCode: string;
  dateFormat: string;
  locale: string;
  /** The backend's address of the logo, or null. Turn it into our own address with toLocalSrc before showing it. */
  logoUrl: string | null;
};

/**
 * The hospital of the signed-in user. It comes from GET /identity/me (no extra permission needed).
 * Only a group-level user, who has no hospital there, falls back to the hospital list (needs organization.hospital.view).
 */
export const getHospital = cache(async (): Promise<HospitalContext | null> => {
  const session = await getSession();
  const fromMe = session?.hospital;
  if (fromMe) {
    return {
      name: fromMe.name,
      timezone: fromMe.timezone,
      currencyCode: fromMe.currencyCode,
      dateFormat: fromMe.dateFormat,
      locale: fromMe.locale,
      logoUrl: fromMe.logoUrl,
    };
  }

  const result = await apiLoad<unknown>("/organization/hospitals", { query: { per_page: 1 } });
  if (!result.ok) return null;
  const first = rec(list(rec(result.data).data)[0]);
  const timezone = str(first.timezone);
  if (!timezone) return null;
  return {
    name: str(first.name),
    timezone,
    currencyCode: str(first.currency_code),
    dateFormat: str(first.date_format),
    locale: str(first.default_locale),
    logoUrl: strOrNull(first.logo_url),
  };
});

/** The id of the hospital this user works in. Taken on the server, never trusted from the browser. */
export const getHospitalId = cache(async (): Promise<string | null> => {
  const session = await getSession();
  if (session?.hospital?.id) return session.hospital.id;
  const result = await apiLoad<unknown>("/organization/hospitals", { query: { per_page: 1 } });
  if (!result.ok) return null;
  return str(rec(list(rec(result.data).data)[0]).id) || null;
});

/** Today and the time now in the hospital's timezone. Falls back to this computer's clock when there is no hospital. */
export async function hospitalNow(): Promise<{ today: string; time: string; timezone: string | null }> {
  const hospital = await getHospital();
  const parts = hospital ? localParts(new Date(), hospital.timezone) : null;
  if (hospital && parts) return { today: parts.date, time: parts.time, timezone: hospital.timezone };

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return { today: localTodayIso(now), time: `${pad(now.getHours())}:${pad(now.getMinutes())}`, timezone: null };
}
