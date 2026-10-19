import { rec, str } from "@/lib/utils/guards";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  mustChangePassword: boolean;
  permissions: string[];
};

/** GET /identity/me answers { data: { id, full_name, email, must_change_password, permissions, ... } } (confirmed from a real response). */
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
    name: str(user.full_name) || str(user.name) || email || "User",
    email,
    mustChangePassword: data.must_change_password === true || user.must_change_password === true,
    permissions,
  };
}