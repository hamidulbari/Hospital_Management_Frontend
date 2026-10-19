"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Option } from "@/components/ui/select-field";
import { useToast } from "@/components/ui/toast-provider";
import { PatientPicker, type PickedPatient } from "@/features/appointments/patient-picker";
import type { ClientError } from "@/lib/api/errors";
import { redirectIfExpired } from "@/lib/session-expired";
import { createInvoiceAction } from "./actions";
import { LinesEditor } from "./lines-editor";
import type { ApiLine } from "./lines";

type Props = { services: Option[]; canDiscount: boolean; canCustom: boolean };

export function NewInvoiceForm({ services, canDiscount, canCustom }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [patient, setPatient] = useState<PickedPatient | null>(null);
  const [patientError, setPatientError] = useState<string | undefined>();

  async function submit(lines: ApiLine[]): Promise<ClientError | null> {
    if (!patient) {
      setPatientError("Choose a patient.");
      toast.error("Choose a patient first.");
      return null;
    }
    const response = await createInvoiceAction({ patient_id: patient.id, lines });
    if (response.ok) {
      toast.success("Draft invoice created.");
      router.push(`/billing/${response.data.id}`);
      return null;
    }
    if (redirectIfExpired(response.error)) return null;
    toast.fromError(response.error, { useFieldMessage: true });
    return response.error;
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="border border-ink bg-surface p-6">
        <h2 className="mb-4 font-headline text-sm font-bold uppercase tracking-wider text-ink">1. Patient</h2>
        <PatientPicker
          value={patient}
          onChange={(next) => {
            setPatient(next);
            setPatientError(undefined);
          }}
          error={patientError}
        />
      </section>

      <section>
        <h2 className="mb-4 font-headline text-sm font-bold uppercase tracking-wider text-ink">2. Lines</h2>
        {services.length === 0 && !canCustom ? (
          <p className="text-sm text-muted">The price list is empty or you may not view it. Ask an administrator.</p>
        ) : (
          <LinesEditor services={services} canDiscount={canDiscount} canCustom={canCustom} initial={[]} submitLabel="Create draft invoice" onSubmit={submit} />
        )}
      </section>
    </div>
  );
}