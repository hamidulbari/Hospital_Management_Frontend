import "server-only";
import type { Option } from "@/components/ui/select-field";
import { apiLoad } from "@/lib/api/load";
import { str } from "@/lib/utils/guards";
import { parseOptionList, parseSpecOptions, type SpecOption } from "./parse";

/** Departments for a picker. Empty when the user may not list them (organization.department.view). */
export async function loadDepartmentOptions(): Promise<Option[]> {
  const result = await apiLoad<unknown>("/organization/departments", { query: { per_page: 100 } });
  return result.ok ? parseOptionList(result.data, (o) => str(o.name)) : [];
}

/** Login accounts, to link a profile to one. Empty when the user may not list them (identity.user.view). */
export async function loadUserOptions(): Promise<Option[]> {
  const result = await apiLoad<unknown>("/identity/users", { query: { per_page: 100 } });
  return result.ok ? parseOptionList(result.data, (o) => [str(o.full_name) || str(o.name), str(o.email)].filter(Boolean).join(" · ")) : [];
}

export async function loadSpecializations(): Promise<SpecOption[]> {
  const result = await apiLoad<unknown>("/specializations");
  return result.ok ? parseSpecOptions(result.data) : [];
}