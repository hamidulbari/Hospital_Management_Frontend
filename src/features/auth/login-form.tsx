"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/ui/notice";
import { PasswordField } from "@/components/ui/password-field";
import { TextField } from "@/components/ui/text-field";
import { clientErrorFromResponse, networkError, type ClientError } from "@/lib/api/errors";
import { applyFieldErrors } from "@/lib/forms";
import { loginSchema, type LoginValues } from "./schemas";

export function LoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<ClientError | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        router.replace("/");
        router.refresh();
        return;
      }

      const body: unknown = await response.json().catch(() => null);
      // The server's wording for a failed sign-in is deliberately the same for every cause: show it as is.
      const error = clientErrorFromResponse(response.status, body, response.headers.get("X-Correlation-Id"), {
        preferServerMessage: true,
      });
      if (!applyFieldErrors(error, setError, ["email", "password"])) setFormError(error);
    } catch {
      setFormError(networkError());
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 flex flex-col gap-5">
      {formError ? <ErrorNotice error={formError} /> : null}
      <TextField label="Email" type="email" autoComplete="username" error={errors.email?.message} {...register("email")} />
      <PasswordField label="Password" autoComplete="current-password" error={errors.password?.message} {...register("password")} />
      <Button type="submit" loading={isSubmitting}>Sign in</Button>
    </form>
  );
}