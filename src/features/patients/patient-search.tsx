"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorNotice } from "@/components/ui/notice";
import { Pagination } from "@/components/ui/pagination";
import { TextField } from "@/components/ui/text-field";
import type { ClientError } from "@/lib/api/errors";
import { formatLocalDate } from "@/lib/datetime";
import { applyFieldErrors } from "@/lib/forms";
import { PATIENTS_PAGE_SIZE } from "./limits";
import { SEX_OPTIONS, labelFor } from "./options";
import { searchPatientsAction } from "./actions";
import type { PatientSearchResult } from "./parse";
import { searchFormSchema, type SearchFormValues } from "./schemas";

export function PatientSearch() {
  const [criteria, setCriteria] = useState<SearchFormValues | null>(null);
  const [result, setResult] = useState<PatientSearchResult | null>(null);
  const [formError, setFormError] = useState<ClientError | null>(null);
  const [paging, setPaging] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SearchFormValues>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: { name: "", phone: "", mrn: "", date_of_birth: "" },
  });

  // Criteria live in component state only: patient details must never appear in the URL.
  async function run(values: SearchFormValues, page: number) {
    setFormError(null);
    const response = await searchPatientsAction({ ...values, page });
    if (response.ok) {
      setCriteria(values);
      setResult(response.data);
      return;
    }
    if (response.error.code === "unauthenticated") {
      window.location.assign("/api/auth/session-expired");
      return;
    }
    if (!applyFieldErrors(response.error, setError, ["name", "phone", "mrn", "date_of_birth"])) setFormError(response.error);
  }

  const onSubmit = handleSubmit((values) => run(values, 1));

  async function goTo(page: number) {
    if (!criteria) return;
    setPaging(true);
    await run(criteria, page);
    setPaging(false);
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5 border border-ink bg-surface p-6">
        {formError ? <ErrorNotice error={formError} /> : null}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
          <div className="md:col-span-4">
            <TextField label="Name" autoComplete="off" error={errors.name?.message} {...register("name")} />
          </div>
          <div className="md:col-span-3">
            <TextField label="Phone" autoComplete="off" error={errors.phone?.message} {...register("phone")} />
          </div>
          <div className="md:col-span-2">
            <TextField label="MRN" autoComplete="off" error={errors.mrn?.message} {...register("mrn")} />
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
        </div>
        <div>
          <Button type="submit" loading={isSubmitting}>Search</Button>
        </div>
      </form>

      {result === null ? (
        <EmptyState
          title="Search to see patients"
          description="The patient register cannot be listed in full: the server asks for a name, phone number or MRN. Enter one above and press Search."
        />
      ) : result.items.length === 0 ? (
        <EmptyState title="No patient found" description="Check the spelling or try another detail." />
      ) : (
        <div className="flex flex-col gap-4" aria-busy={paging || undefined}>
          <div className={clsx("overflow-x-auto border border-ink bg-surface", paging && "opacity-60")}>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink font-headline text-xs uppercase tracking-wider">
                <tr>
                  <th scope="col" className="p-3">MRN</th>
                  <th scope="col" className="p-3">Name</th>
                  <th scope="col" className="p-3">Sex</th>
                  <th scope="col" className="p-3">Date of birth</th>
                  <th scope="col" className="p-3">Phone</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((patient) => (
                  <tr key={patient.id} className="border-b border-accent last:border-b-0 hover:bg-accent">
                    <td className="p-3">{patient.mrn || "—"}</td>
                    <td className="p-3">
                      {/* prefetch off: opening a record is an audited read, so it must only happen on a click. */}
                      <Link href={`/patients/${patient.id}`} prefetch={false} className="font-medium underline">
                        {patient.displayName || "Unnamed patient"}
                      </Link>
                    </td>
                    <td className="p-3">{patient.sexAtBirth ? labelFor(SEX_OPTIONS, patient.sexAtBirth) : "—"}</td>
                    <td className="p-3">{patient.dateOfBirth ? formatLocalDate(patient.dateOfBirth) : "—"}</td>
                    <td className="p-3">{patient.phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={result.currentPage}
            lastPage={result.lastPage}
            total={result.total}
            pageSize={PATIENTS_PAGE_SIZE}
            disabled={paging}
            onPageChange={goTo}
          />
        </div>
      )}
    </div>
  );
}