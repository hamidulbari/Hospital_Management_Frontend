import { rec, str, strOrNull } from "@/lib/utils/guards";

export type SessionHospital = {
  id: string;
  name: string;
  timezone: string;
  currencyCode: string;
  dateFormat: string;
  locale: string;
  logoUrl: string | null;
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  mustChangePassword: boolean;
  permissions: string[];
  /** From GET /identity/me, for every user. null for a group-level user who has no hospital. */
  hospital: SessionHospital | null;
};

/** GET /identity/me answers { data: { id, full_name, email, must_change_password, permissions, hospital: {...}, ... } } (schema confirmed). */
export function parseMe(body: unknown): SessionUser {
  const data = rec(rec(body).data);
  const user = rec(data.user ?? data);
  const rawPermissions = data.permissions ?? user.permissions;
  const permissions = Array.isArray(rawPermissions)
    ? rawPermissions.filter((p): p is string => typeof p === "string")
    : [];
  const email = str(user.email);
  const h = rec(data.hospital ?? user.hospital);
  const timezone = str(h.timezone);

  return {
    id: str(user.id),
    name: str(user.full_name) || str(user.name) || email || "User",
    email,
    mustChangePassword: data.must_change_password === true || user.must_change_password === true,
    permissions,
    hospital: timezone
      ? {
          id: str(h.id),
          name: str(h.name),
          timezone,
          currencyCode: str(h.currency_code),
          dateFormat: str(h.date_format),
          locale: str(h.locale),
          logoUrl: strOrNull(h.logo_url),
        }
      : null,
  };
}
