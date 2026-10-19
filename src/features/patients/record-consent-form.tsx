"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/ui/notice";
import { SelectField } from "@/components/ui/select-field";
import { useToast } from "@/components/ui/toast-provider";
import type { ClientError } from "@/lib/api/errors";
import { applyFieldErrors } from "@/lib/forms";
import { recordConsentAction } from "./actions";
import { CONSENT_METHOD_OPTIONS, CONSENT_TYPE_OPTIONS, GIVEN_BY_OPTIONS } from "./options";
import { consentFormSchema, type ConsentFormValues } from "./schemas";

export function RecordConsentForm({ patientId }: { patientId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [formError, setFormError] = useState<ClientError | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ConsentFormValues>({
    resolver: zodResolver(consentFormSchema),
    defaultValues: { type: "", method: "", given_by: "" },
  });

  async function onSubmit(values: ConsentFormValues) {
    setFormError(null);
    const response = await recordConsentAction(patientId, values);
    if (response.ok) {
      toast.success("Consent recorded.");
      reset();
      router.refresh();
      return;
    }
    if (response.error.code === "unauthenticated") {
      window.location.assign("/api/auth/session-expired");
      return;
    }
    if (!applyFieldErrors(response.error, setError, ["type", "method", "given_by"])) setFormError(response.error);
    toast.fromError(response.error, { useFieldMessage: true });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit, () => toast.error("Please correct the highlighted fields."))}
      noValidate
      className="mt-6 flex flex-col gap-5 border border-ink bg-surface p-6"
    >
      <h3 className="font-headline text-xs font-semibold uppercase tracking-wider text-ink">Record a consent</h3>
      {formError ? <ErrorNotice error={formError} /> : null}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <SelectField label="Type" options={CONSENT_TYPE_OPTIONS} value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={errors.type?.message} />
          )}
        />
        <Controller
          control={control}
          name="method"
          render={({ field }) => (
            <SelectField label="Method" options={CONSENT_METHOD_OPTIONS} value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={errors.method?.message} />
          )}
        />
        <Controller
          control={control}
          name="given_by"
          render={({ field }) => (
            <SelectField label="Given by" options={GIVEN_BY_OPTIONS} value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={errors.given_by?.message} />
          )}
        />
      </div>
      <div>
        <Button type="submit" loading={isSubmitting}>Record consent</Button>
      </div>
    </form>
  );
}