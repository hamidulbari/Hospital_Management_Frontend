import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email.").email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
export type LoginValues = z.infer<typeof loginSchema>;

// What is sent to the API. Password strength is checked by the server only.
export const changePasswordRequestSchema = z.object({
  current_password: z.string().min(1).max(200),
  password: z.string().min(1).max(200),
});

export const changePasswordFormSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password."),
    password: z.string().min(1, "Enter a new password."),
    confirm_password: z.string().min(1, "Repeat the new password."),
  })
  .refine((v) => v.password === v.confirm_password, {
    path: ["confirm_password"],
    message: "The passwords do not match.",
  });
export type ChangePasswordValues = z.infer<typeof changePasswordFormSchema>;