"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast-provider";
import { labelFor } from "@/features/patients/options";
import { humanize } from "@/lib/format";
import { redirectIfExpired } from "@/lib/session-expired";
import { addDiagnosisAction, markDiagnosisErrorAction } from "./actions";
import { CODE_SYSTEM_OPTIONS, DIAGNOSIS_TYPE_OPTIONS, clinicalTone } from "./options";
import type { DiagnosisItem } from "./parse";

type Props = { encounterId: string; diagnoses: DiagnosisItem[]; open: boolean; canWrite: boolean };

export function DiagnosesPanel({ encounterId, diagnoses, open, canWrite }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [type, setType] = useState("");
  const [system, setSystem] = useState("free_text");
  const [code, setCode] = useState("");
  const [display, setDisplay] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<DiagnosisItem | null>(null);
  const [marking, setMarking] = useState(false);
  const editable = canWrite && open;

  async function submit() {
    const problems: Record<string, string> = {};
    if (!type) problems.diagnosis_type = "Choose one.";
    if (!display.trim()) problems.display = "Write the diagnosis in your own words.";
    if (Object.keys(problems).length > 0) {
      setErrors(problems);
      toast.error("Please complete the highlighted fields.");
      return;
    }

    setBusy(true);
    const response = await addDiagnosisAction(encounterId, { diagnosis_type: type, code_system: system, code, display });
    setBusy(false);
    if (response.ok) {
      toast.success("Diagnosis recorded.");
      setType("");
      setSystem("free_text");
      setCode("");
      setDisplay("");
      setErrors({});
      router.refresh();
      return;
    }
    if (redirectIfExpired(response.error)) return;
    setErrors(response.error.fieldErrors);
    toast.fromError(response.error, { useFieldMessage: true });
  }

  async function confirmMark() {
    if (!target) return;
    setMarking(true);
    const response = await markDiagnosisErrorAction(target.id);
    setMarking(false);
    setTarget(null);
    if (response.ok) {
      toast.success("Marked as entered in error.");
      router.refresh();
      return;
    }
    if (redirectIfExpired(response.error)) return;
    toast.fromError(response.error, { useFieldMessage: true });
  }

  return (
    <div className="flex flex-col gap-6">
      {diagnoses.length === 0 ? (
        <p className="text-sm text-muted">No diagnoses recorded.</p>
      ) : (
        <ul className="border border-ink bg-surface">
          {diagnoses.map((diagnosis, index) => {
            const wrong = diagnosis.status === "entered_in_error";
            return (
              <li key={diagnosis.id || index} className="flex flex-wrap items-center justify-between gap-3 border-b border-accent p-4 last:border-b-0">
                <div>
                  <p className={wrong ? "text-sm text-muted line-through" : "text-sm font-medium text-ink"}>{diagnosis.display}</p>
                  <p className="text-xs text-muted">
                    {diagnosis.type ? labelFor(DIAGNOSIS_TYPE_OPTIONS, diagnosis.type) : ""}
                    {diagnosis.codeSystem && diagnosis.codeSystem !== "free_text" ? ` · ${labelFor(CODE_SYSTEM_OPTIONS, diagnosis.codeSystem)}` : ""}
                    {diagnosis.code ? ` ${diagnosis.code}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {wrong ? <StatusBadge label={humanize(diagnosis.status)} tone={clinicalTone(diagnosis.status)} /> : null}
                  {editable && !wrong && diagnosis.id ? (
                    <Button size="sm" variant="secondary" onClick={() => setTarget(diagnosis)}>Entered in error</Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editable ? (
        <div className="border border-ink bg-surface p-6">
          <h3 className="mb-1 font-headline text-xs font-semibold uppercase tracking-wider text-ink">Record a diagnosis</h3>
          <p className="mb-4 text-xs text-muted">Written exactly as you word it. Nothing here suggests or completes a diagnosis. A code is optional.</p>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
            <div className="md:col-span-3">
              <SelectField label="Type *" options={DIAGNOSIS_TYPE_OPTIONS} value={type} onChange={setType} error={errors.diagnosis_type} />
            </div>
            <div className="md:col-span-3">
              <SelectField label="Code system" options={CODE_SYSTEM_OPTIONS} value={system} onChange={setSystem} error={errors.code_system} />
            </div>
            <div className="md:col-span-3">
              <TextField label="Code (optional)" autoComplete="off" maxLength={20} value={code} onChange={(event) => setCode(event.target.value)} error={errors.code} />
            </div>
            <div className="md:col-span-12">
              <TextField label="Diagnosis (your own words) *" autoComplete="off" maxLength={255} value={display} onChange={(event) => setDisplay(event.target.value)} error={errors.display} />
            </div>
          </div>
          <div className="mt-5">
            <Button onClick={submit} loading={busy}>Record diagnosis</Button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={target !== null}
        title="Mark this diagnosis as entered in error?"
        description="It is never deleted: it stays on the record and is marked as entered in error."
        confirmLabel="Mark as entered in error"
        busy={marking}
        onConfirm={confirmMark}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}