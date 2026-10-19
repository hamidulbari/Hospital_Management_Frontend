import { z } from "zod";
import { idSchema } from "@/features/patients/schemas";
import { isValidTimeZone } from "./timezones";

const optionalId = z.string().refine((v) => v === "" || idSchema.safeParse(v).success, "Choose from the list.");
const text = (max: number) => z.string().trim().max(max, `At most ${max} characters.`);
const requiredName = z.string().trim().min(1, "Enter a name.").max(200, "At most 200 characters.");
const optionalEmail = z.string().trim().max(190, "At most 190 characters.").refine((v) => v === "" || /^\S+@\S+\.\S+$/.test(v), "Enter a valid email address.");

export const hospitalSchema = z.object({
  name: requiredName,
  registration_no: text(60),
  gstin: text(20),
  pan: text(20),
  address_line1: text(200),
  address_line2: text(200),
  city: text(100),
  state: text(100),
  pincode: text(10),
  phone: text(30),
  email: optionalEmail,
  timezone: z.string().refine(isValidTimeZone, "Choose a timezone from the list."),
  default_locale: z.string().trim().min(1, "Enter a locale such as en.").max(10, "At most 10 characters."),
  date_format: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"], { message: "Choose a date format." }),
});

const branchFields = {
  name: requiredName,
  address_line1: text(200),
  address_line2: text(200),
  city: text(100),
  state: text(100),
  pincode: text(10),
  phone: text(30),
  is_main: z.boolean(),
};

export const branchCreateSchema = z.object({ code: z.string().trim().min(1, "Enter a code.").max(30, "At most 30 characters."), ...branchFields });
export const branchUpdateSchema = z.object({ ...branchFields, status: z.enum(["active", "inactive"], { message: "Choose a status." }) });

const departmentType = z.enum(["clinical", "diagnostic", "support", "administrative"], { message: "Choose a type." });

export const departmentCreateSchema = z.object({
  code: z.string().trim().min(1, "Enter a code.").max(30, "At most 30 characters."),
  name: requiredName,
  type: departmentType,
  branch_id: optionalId,
  parent_id: optionalId,
});
export const departmentUpdateSchema = z.object({
  name: requiredName,
  type: departmentType,
  status: z.enum(["active", "inactive"], { message: "Choose a status." }),
});