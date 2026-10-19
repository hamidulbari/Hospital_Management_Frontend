"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/ui/notice";
import { PasswordField } from "@/components/ui/password-field";
import { useToast } from "@/components/ui/toast-provider";
import type { ClientError } from "@/lib/api/errors";
import { applyFieldErrors } from "@/lib/forms";
import { changePasswordAction } from "./actions";
import { changePasswordFormSchema, type ChangePasswordValues } from "./schemas";

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [formError, setFormError] = useState<ClientError | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordFormSchema) });

  async function onSubmit(values: ChangePasswordValues) {
    setFormError(null);
    const result = await changePasswordAction({
      current_password: values.current_password,
      password: values.password,
    });

    if (result.ok) {
      toast.success("Password changed.");
      router.replace("/");
      router.refresh();
      return;
    }
    if (result.error.code === "unauthenticated") {
      window.location.assign("/api/auth/session-expired");
      return;
    }
    if (!applyFieldErrors(result.error, setError, ["current_password", "password"])) setFormError(result.error);
    toast.fromError(result.error, { useFieldMessage: true });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit, () => toast.error("Please correct the highlighted fields."))}
      noValidate
      className="mt-6 flex flex-col gap-5"
    >
      {formError ? <ErrorNotice error={formError} /> : null}
      <PasswordField label="Current password" autoComplete="current-password" error={errors.current_password?.message} {...register("current_password")} />
      <PasswordField
        label="New password"
        autoComplete="new-password"
        hint="At least 12 characters with upper and lower case letters, a number and a symbol."
        error={errors.password?.message}
        {...register("password")}
      />
      <PasswordField label="Repeat new password" autoComplete="new-password" error={errors.confirm_password?.message} {...register("confirm_password")} />
      <div className="flex items-center gap-4">
        <Button type="submit" loading={isSubmitting}>Change password</Button>
        {forced ? null : (
          <Link href="/" className="text-sm font-medium text-ink underline hover:text-primary">Cancel</Link>
        )}
      </div>
    </form>
  );
}