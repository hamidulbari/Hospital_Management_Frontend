"use client";

import { useRouter } from "next/navigation";
import { useNavigationProgress } from "@/components/ui/navigation-progress";
import { PatientPicker } from "@/features/appointments/patient-picker";

/** Choose a patient, then go to their statement. Only the id goes into the address. */
export function StatementPicker() {
  const router = useRouter();
  const progress = useNavigationProgress();

  return (
    <div className="border border-ink bg-surface p-6">
      <PatientPicker
        value={null}
        onChange={(patient) => {
          if (!patient) return;
          progress.start();
          router.push(`/billing/statement/${patient.id}`);
        }}
      />
    </div>
  );
}