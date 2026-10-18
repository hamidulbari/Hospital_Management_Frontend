import { rec, str } from "@/lib/utils/guards";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  mustChangePassword: boolean;
  permissions: string[];
};

/**
 * ASSUMPTION (not yet confirmed against a real response): GET /identity/me answers
 * { data: { user: {...}, must_change_password, permissions } } or a flat { data: {...} }.
 * Both are handled. This is the ONLY place that knows the shape.
 */
export function parseMe(body: unknown): SessionUser {
  const data = rec(rec(body).data);
  const user = rec(data.user ?? data);
  const rawPermissions = data.permissions ?? user.permissions;
  const permissions = Array.isArray(rawPermissions)
    ? rawPermissions.filter((p): p is string => typeof p === "string")
    : [];
  const email = str(user.email);

  return {
    id: str(user.id),
    name: str(user.name) || email || "User",
    email,
    mustChangePassword: data.must_change_password === true || user.must_change_password === true,
    permissions,
  };
}