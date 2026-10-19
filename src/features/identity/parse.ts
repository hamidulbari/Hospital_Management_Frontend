import { parsePage, type PageInfo } from "@/lib/api/meta";
import { humanize } from "@/lib/format";
import { bool, list, rec, str, strOrNull, type Rec } from "@/lib/utils/guards";

export type RoleRef = { id: string; name: string };
export type UserItem = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  roles: RoleRef[];
  mustChangePassword: boolean;
  lastLoginAt: string | null;
};
export type RoleItem = { id: string; name: string; description: string; permissions: string[] };
export type PermissionItem = { code: string; description: string };

function roleNameOf(o: Rec): string {
  return str(o.name) || str(o.display_name) || str(o.code) || str(o.slug);
}

function parseRoleRef(raw: unknown): RoleRef {
  if (typeof raw === "string") return { id: "", name: raw };
  const o = rec(raw);
  return { id: str(o.id), name: roleNameOf(o) };
}

export function permissionCode(raw: unknown): string {
  return typeof raw === "string" ? raw : str(rec(raw).code) || str(rec(raw).name);
}

function userOf(raw: unknown): UserItem {
  const u = rec(raw);
  return {
    id: str(u.id),
    name: str(u.full_name) || str(u.name),
    email: str(u.email),
    phone: str(u.phone),
    status: str(u.status),
    roles: list(u.roles).map(parseRoleRef),
    mustChangePassword: bool(u.must_change_password),
    lastLoginAt: strOrNull(u.last_login_at),
  };
}

export function parseUser(body: unknown): UserItem {
  return userOf(rec(body).data);
}

export function parseUserList(body: unknown): { items: UserItem[] } & PageInfo {
  const items = list(rec(body).data).map(userOf);
  return { items, ...parsePage(body, items.length) };
}

export function parseRoles(body: unknown): RoleItem[] {
  return list(rec(body).data).map((raw) => {
    const r = rec(raw);
    return {
      id: str(r.id),
      name: roleNameOf(r),
      description: str(r.description),
      permissions: list(r.permissions).map(permissionCode).filter(Boolean),
    };
  });
}

export function parsePermissions(body: unknown): PermissionItem[] {
  return list(rec(body).data)
    .map((raw) => ({ code: permissionCode(raw), description: typeof raw === "string" ? "" : str(rec(raw).description) || str(rec(raw).label) }))
    .filter((p) => p.code);
}

/** "org_admin" -> "Org admin". A name that is already readable stays as it is. */
export function displayRole(name: string): string {
  return /^[a-z0-9]+(_[a-z0-9]+)+$/.test(name) ? humanize(name) : name;
}

/** "patient.view", "patient.register", "billing.invoice.view" -> groups by the first word. */
export function groupPermissions(codes: readonly string[]): { module: string; codes: string[] }[] {
  const groups = new Map<string, string[]>();
  for (const code of codes) {
    const area = code.split(".")[0] || "other";
    groups.set(area, [...(groups.get(area) ?? []), code]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([area, items]) => ({ module: area, codes: [...items].sort() }));
}