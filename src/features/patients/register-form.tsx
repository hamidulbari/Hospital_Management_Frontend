"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { DateField } from "@/components/ui/date-field";
import { ErrorNotice, Notice } from "@/components/ui/notice";
import { PhoneField } from "@/components/ui/phone-field";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast-provider";
import { formatAge } from "@/lib/age";
import { localTodayIso } from "@/lib/calendar";
import type { ClientError } from "@/lib/api/errors";
import { applyAllFieldErrors } from "@/lib/forms";
import { registerPatientAction } from "./actions";
import { canAddContact } from "./contact-rules";
import { MAX_CONTACTS } from "./limits";
import { BLOOD_GROUP_OPTIONS, SEX_OPTIONS, TITLE_OPTIONS, defaultConsentDrafts } from "./options";
import { remapConsentFieldErrors } from "./payload";
import { RegistrationConsents } from "./registration-consents";
import { registerFormSchema, type RegisterFormValues } from "./schemas";

const emptyContact = { name: "", relationship: "", phone: "", is_emergency: false, is_authorized_representative: false };

export function RegisterForm() {
  const router = useRouter();
  const toast = useToast();
  const [formError, setFormError] = useState<ClientError | null>(null);
  const [duplicate, setDuplicate] = useState<{ error: ClientError; values: RegisterFormValues } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      title: "",
      first_name: "",
      middle_name: "",
      last_name: "",
      sex_at_birth: "",
      date_of_birth: "",
      estimated_age_years: "",
      phone: "",
      email: "",
      blood_group: "",
      preferred_language: "",
      contacts: [],
      consents: defaultConsentDrafts(),
    },
  });
  const contacts = useFieldArray({ control, name: "contacts" });

  // A contact row can only be added when the patient's own details and every existing contact are filled in.
  const draft = useWatch({ control });
  const addRule = canAddContact(draft, MAX_CONTACTS);

  function addContact() {
    if (!canAddContact(draft, MAX_CONTACTS).allowed) return;
    contacts.append(emptyContact);
  }

  // The age is worked out from the date of birth. The estimate is only for unknown dates of birth.
  const dateOfBirth = useWatch({ control, name: "date_of_birth" });
  const age = formatAge(dateOfBirth, localTodayIso());
  useEffect(() => {
    if (age) setValue("estimated_age_years", "");
  }, [age, setValue]);

  async function send(values: RegisterFormValues, acknowledge: boolean) {
    setFormError(null);
    setDuplicate(null);
    const response = await registerPatientAction(values, acknowledge);

    if (response.ok) {
      toast.success("Patient registered.");
      router.push(`/patients/${response.data.id}`);
      return;
    }
    const error = response.error;
    if (error.code === "unauthenticated") {
      window.location.assign("/api/auth/session-expired");
      return;
    }
    if (error.code === "possible_duplicate") {
      setDuplicate({ error, values });
      toast.error("A similar patient may already exist. Please review before registering.");
      return;
    }
    const mapped = { ...error, fieldErrors: remapConsentFieldErrors(error.fieldErrors, values) };
    applyAllFieldErrors(mapped, setError);
    setFormError(mapped);
    toast.fromError(mapped);
  }

  const onSubmit = handleSubmit(
    (values) => send(values, false),
    () => toast.error("Please correct the highlighted fields."),
  );

  async function registerAnyway() {
    if (!duplicate) return;
    setConfirming(true);
    await send(duplicate.values, true);
    setConfirming(false);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
      {formError ? <ErrorNotice error={formError} /> : null}

      {duplicate ? (
        <Notice tone="error">
          <p className="font-medium">A similar patient may already exist.</p>
          <p className="mt-1">{duplicate.error.serverMessage || duplicate.error.message}</p>
          <p className="mt-1 text-xs">Search for the patient first. Registering anyway is recorded in the audit trail.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="danger" onClick={registerAnyway} loading={confirming}>Register anyway</Button>
            <Button variant="secondary" onClick={() => setDuplicate(null)} disabled={confirming}>Review details</Button>
          </div>
        </Notice>
      ) : null}

      <div className="grid grid-cols-1 gap-5 border border-ink bg-surface p-6 md:grid-cols-12">
        <div className="md:col-span-2">
          <Controller
            control={control}
            name="title"
            render={({ field }) => (
              <SelectField
                label="Title"
                options={TITLE_OPTIONS}
                allowEmpty
                emptyLabel="No title"
                placeholder="Title"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.title?.message}
              />
            )}
          />
        </div>
        <div className="md:col-span-4">
          <TextField label="First name *" autoComplete="off" error={errors.first_name?.message} {...register("first_name")} />
        </div>
        <div className="md:col-span-3">
          <TextField label="Middle name" autoComplete="off" error={errors.middle_name?.message} {...register("middle_name")} />
        </div>
        <div className="md:col-span-3">
          <TextField label="Last name" autoComplete="off" error={errors.last_name?.message} {...register("last_name")} />
        </div>

        <div className="md:col-span-3">
          <Controller
            control={control}
            name="sex_at_birth"
            render={({ field }) => (
              <SelectField
                label="Sex at birth *"
                options={SEX_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.sex_at_birth?.message}
              />
            )}
          />
        </div>
        <div className="md:col-span-3">
          <Controller
            control={control}
            name="date_of_birth"
            render={({ field }) => (
              <DateField
                label="Date of birth"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.date_of_birth?.message}
              />
            )}
          />
        </div>
        <div className="md:col-span-3">
          {/* Different keys: React must NOT reuse one input for both, or the form library writes "" into the age box. */}
          {age ? (
            <TextField key="age" label="Age" value={age} readOnly hint="Calculated from the date of birth." />
          ) : (
            <TextField
              key="estimated-age"
              label="Estimated age (years)"
              inputMode="numeric"
              hint="Use only if the date of birth is not known."
              error={errors.estimated_age_years?.message}
              {...register("estimated_age_years")}
            />
          )}
        </div>
        <div className="md:col-span-3">
          <Controller
            control={control}
            name="blood_group"
            render={({ field }) => (
              <SelectField
                label="Blood group"
                options={BLOOD_GROUP_OPTIONS}
                allowEmpty
                emptyLabel="Not known"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.blood_group?.message}
              />
            )}
          />
        </div>

        <div className="md:col-span-5">
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <PhoneField
                label="Phone *"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.phone?.message}
              />
            )}
          />
        </div>
        <div className="md:col-span-4">
          <TextField label="Email" type="email" autoComplete="off" error={errors.email?.message} {...register("email")} />
        </div>
        <div className="md:col-span-3">
          <TextField label="Preferred language" hint="Short code, up to 10 characters." error={errors.preferred_language?.message} {...register("preferred_language")} />
        </div>
      </div>

      <section className="border-t border-ink pt-4">
        <div className="mb-2 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <h2 className="font-headline text-sm font-bold uppercase tracking-wider text-ink">Contacts</h2>
            <span className="text-xs text-muted">{contacts.fields.length} of {MAX_CONTACTS}</span>
          </div>
          <Button
            variant="secondary"
            disabled={!addRule.allowed}
            aria-describedby={addRule.reason ? "add-contact-reason" : undefined}
            onClick={addContact}
          >
            Add contact
          </Button>
        </div>
        {addRule.reason ? (
          <p id="add-contact-reason" className="mb-3 text-xs text-muted">{addRule.reason}</p>
        ) : null}
        {errors.contacts?.message ? <p className="mb-3 text-xs font-medium text-error">{errors.contacts.message}</p> : null}
        {contacts.fields.length === 0 ? <p className="mt-3 text-sm text-muted">No contacts added.</p> : null}
        <div className="mt-3 flex flex-col gap-4">
          {contacts.fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 gap-5 border border-ink bg-surface p-6 md:grid-cols-12">
              <div className="md:col-span-4">
                <TextField label="Name *" error={errors.contacts?.[index]?.name?.message} {...register(`contacts.${index}.name`)} />
              </div>
              <div className="md:col-span-3">
                <TextField label="Relationship *" error={errors.contacts?.[index]?.relationship?.message} {...register(`contacts.${index}.relationship`)} />
              </div>
              <div className="md:col-span-5">
                <Controller
                  control={control}
                  name={`contacts.${index}.phone`}
                  render={({ field: phone }) => (
                    <PhoneField
                      label="Phone *"
                      name={phone.name}
                      value={phone.value}
                      onChange={phone.onChange}
                      onBlur={phone.onBlur}
                      error={errors.contacts?.[index]?.phone?.message}
                    />
                  )}
                />
              </div>
              <div className="flex flex-wrap items-center gap-6 md:col-span-12">
                <CheckboxField label="Emergency contact" {...register(`contacts.${index}.is_emergency`)} />
                <CheckboxField label="Authorized representative" {...register(`contacts.${index}.is_authorized_representative`)} />
                <Button variant="secondary" onClick={() => contacts.remove(index)}>Remove</Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <RegistrationConsents control={control} errors={errors} />

      <div className="flex items-center gap-4">
        <Button type="submit" loading={isSubmitting} disabled={confirming}>Register patient</Button>
        <Link href="/patients" className="text-sm font-medium text-ink underline hover:text-primary">Cancel</Link>
      </div>
    </form>
  );
}