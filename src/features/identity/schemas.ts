import { z } from "zod";
import { idSchema } from "@/features/patients/schemas";

export const createUserSchema = z.object({
  full_name: z.string().trim().min(1, "Enter the name.").max(200, "At most 200 characters."),
  email: z.string().trim().min(1, "Enter the email.").max(190, "At most 190 characters.").email("Enter a valid email address."),
  phone: z.string().trim().max(30, "At most 30 characters."),
  password: z.string().min(1, "Enter a temporary password.").max(200, "At most 200 characters."),
});

export const updateUserSchema = z.object({
  full_name: z.string().trim().min(1, "Enter the name.").max(200, "At most 200 characters."),
  phone: z.string().trim().max(30, "At most 30 characters."),
});

export const statusSchema = z.object({ status: z.enum(["active", "disabled"]) });
export const rolesSchema = z.object({ roles: z.array(idSchema).max(50) });