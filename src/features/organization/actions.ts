"use server";

import { apiFetch } from "@/lib/api/client";
import { fieldErrorsFromZod, invalidInput } from "@/lib/api/invalid";
import { failure, type ActionResult } from "@/lib/api/result";
import { idSchema } from "@/features/patients/schemas";
import { branchCreateSchema, branchUpdateSchema, departmentCreateSchema, departmentUpdateSchema, hospitalSchema } from "./schemas";

const bad = (message: string) => invalidInput({}, message);
/** Empty text clears a field (null). */
const nullable = (value: string): string | null => (value.trim() === "" ? null : value.trim());
const present = (entries: Record<string, string>) => Object.fromEntries(Object.entries(entries).filter(([, v]) => v.trim() !== ""));

export async function updateHospitalAction(hospitalId: string, input: unknown): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(hospitalId);
  const parsed = hospitalSchema.safeParse(input);
  if (!id.success) return bad("Unknown hospital.");
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  const v = parsed.data;
  try {
    await apiFetch(`/organization/hospitals/${id.data}`, {
      method: "PATCH",
      body: {
        name: v.name,
        registration_no: nullable(v.registration_no),
        gstin: nullable(v.gstin.toUpperCase()),
        pan: nullable(v.pan.toUpperCase()),
        address_line1: nullable(v.address_line1),
        address_line2: nullable(v.address_line2),
        city: nullable(v.city),
        state: nullable(v.state),
        pincode: nullable(v.pincode),
        phone: nullable(v.phone),
        email: nullable(v.email),
        timezone: v.timezone,
        default_locale: v.default_locale,
        date_format: v.date_format,
      },
      redirectOn401: false,
    });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function createBranchAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = branchCreateSchema.safeParse(input);
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  const { is_main, code, name, ...rest } = parsed.data;
  try {
    await apiFetch("/organization/branches", { method: "POST", body: { code, name, is_main, ...present(rest) }, redirectOn401: false });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function updateBranchAction(branchId: string, input: unknown): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(branchId);
  const parsed = branchUpdateSchema.safeParse(input);
  if (!id.success) return bad("Unknown branch.");
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  const v = parsed.data;
  try {
    await apiFetch(`/organization/branches/${id.data}`, {
      method: "PATCH",
      body: {
        name: v.name,
        address_line1: nullable(v.address_line1),
        address_line2: nullable(v.address_line2),
        city: nullable(v.city),
        state: nullable(v.state),
        pincode: nullable(v.pincode),
        phone: nullable(v.phone),
        is_main: v.is_main,
        status: v.status,
      },
      redirectOn401: false,
    });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function createDepartmentAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = departmentCreateSchema.safeParse(input);
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  const { code, name, type, branch_id, parent_id } = parsed.data;
  try {
    await apiFetch("/organization/departments", {
      method: "POST",
      body: { code, name, type, ...present({ branch_id, parent_id }) },
      redirectOn401: false,
    });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function updateDepartmentAction(departmentId: string, input: unknown): Promise<ActionResult<null>> {
  const id = idSchema.safeParse(departmentId);
  const parsed = departmentUpdateSchema.safeParse(input);
  if (!id.success) return bad("Unknown department.");
  if (!parsed.success) return invalidInput(fieldErrorsFromZod(parsed.error));
  try {
    await apiFetch(`/organization/departments/${id.data}`, { method: "PATCH", body: parsed.data, redirectOn401: false });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}