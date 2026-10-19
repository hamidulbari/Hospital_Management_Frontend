"use client";

import { Controller, useWatch, type Control, type FieldErrors } from "react-hook-form";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { SelectField } from "@/components/ui/select-field";
import { CONSENT_METHOD_OPTIONS, CONSENT_TYPE_OPTIONS, GIVEN_BY_OPTIONS } from "./options";
import type { RegisterFormValues } from "./schemas";

export function RegistrationConsents({ control, errors }: { control: Control<RegisterFormValues>; errors: FieldErrors<RegisterFormValues> }) {
  const consents = useWatch({ control, name: "consents" });

  return (
    <section className="border-t border-ink pt-4">
      <h2 className="font-headline text-sm font-bold uppercase tracking-wider text-ink">Consents</h2>
      <p className="mb-4 mt-1 text-xs text-muted">
        Tick only the consents that have been given. You can also record or withdraw consents later on the patient record.
      </p>
      <ul className="border border-ink bg-surface">
        {CONSENT_TYPE_OPTIONS.map((option, index) => {
          const granted = consents?.[index]?.granted === true;
          return (
            <li key={option.value} className="grid grid-cols-1 items-start gap-4 border-b border-accent p-4 last:border-b-0 md:grid-cols-12">
              <div className="flex h-10 items-center md:col-span-4">
                <Controller
                  control={control}
                  name={`consents.${index}.granted`}
                  render={({ field }) => (
                    <CheckboxField
                      label={option.label}
                      name={field.name}
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      onBlur={field.onBlur}
                    />
                  )}
                />
              </div>
              {granted ? (
                <>
                  <div className="md:col-span-4">
                    <Controller
                      control={control}
                      name={`consents.${index}.method`}
                      render={({ field }) => (
                        <SelectField
                          label="Method *"
                          options={CONSENT_METHOD_OPTIONS}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          error={errors.consents?.[index]?.method?.message}
                        />
                      )}
                    />
                  </div>
                  <div className="md:col-span-4">
                    <Controller
                      control={control}
                      name={`consents.${index}.given_by`}
                      render={({ field }) => (
                        <SelectField
                          label="Given by *"
                          options={GIVEN_BY_OPTIONS}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          error={errors.consents?.[index]?.given_by?.message}
                        />
                      )}
                    />
                  </div>
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}