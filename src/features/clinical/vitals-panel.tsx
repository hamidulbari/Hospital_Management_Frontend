"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ReasonDialog } from "@/components/ui/reason-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast-provider";
import type { ClientError } from "@/lib/api/errors";
import { humanize } from "@/lib/format";
import { showInstant } from "@/lib/format-instant";
import { redirectIfExpired } from "@/lib/session-expired";
import { markVitalErrorAction, recordVitalsAction } from "./actions";
import { VITAL_FIELDS, clinicalTone, prettyUnit, vitalLabel } from "./options";
import type { VitalItem } from "./parse";

type Props = { encounterId: string; vitals: VitalItem[]; canRecord: boolean; open: boolean; timezone: string | null };

const NUMBER_RE = /^\d+(\.\d+)?$/;

export function VitalsPanel({ encounterId, vitals, canRecord, open, timezone }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<VitalItem | null>(null);
  const editable = canRecord && open;

  async function submit() {
    const filled = VITAL_FIELDS.filter((field) => (values[field.code] ?? "").trim() !== "");
    if (filled.length === 0) {
      toast.error("Enter at least one reading.");
      return;
    }
    const problems: Record<string, string> = {};
    const readings: { code: string; value: number }[] = [];
    for (const field of filled) {
      const text = (values[field.code] ?? "").trim();
      if (NUMBER_RE.test(text)) readings.push({ code: field.code, value: Number(text) });
      else problems[field.code] = "Enter a number.";
    }
    if (Object.keys(problems).length > 0) {
      setErrors(problems);
      toast.error("Please correct the highlighted fields.");
      return;
    }

    setBusy(true);
    const response = await recordVitalsAction(encounterId, { readings });
    setBusy(false);

    if (response.ok) {
      toast.success("Vital signs recorded.");
      setValues({});
      setErrors({});
      router.refresh();
      return;
    }
    if (redirectIfExpired(response.error)) return;
    // The server numbers readings by their place in what we sent: map back to the field. Its own message is shown as is.
    const mapped: Record<string, string> = {};
    for (const [path, message] of Object.entries(response.error.fieldErrors)) {
      const match = /^readings\.(\d+)/.exec(path);
      const field = match ? filled[Number(match[1])] : undefined;
      if (field) mapped[field.code] = message;
    }
    setErrors(mapped);
    toast.fromError(response.error, { useFieldMessage: true });
  }

  async function submitError(reason: string): Promise<ClientError | null> {
    if (!target) return null;
    const response = await markVitalErrorAction(encounterId, target.id, { reason });
    if (response.ok) {
      toast.success("Marked as entered in error.");
      setTarget(null);
      router.refresh();
      return null;
    }
    if (redirectIfExpired(response.error)) return null;
    toast.fromError(response.error, { useFieldMessage: true });
    return response.error;
  }

  return (
    <div className="flex flex-col gap-6">
      {vitals.length === 0 ? (
        <p className="text-sm text-muted">No vital signs recorded.</p>
      ) : (
        <div className="overflow-x-auto border border-ink bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink font-headline text-xs uppercase tracking-wider">
              <tr>
                <th scope="col" className="p-3">Measurement</th>
                <th scope="col" className="p-3">Value</th>
                <th scope="col" className="p-3">Recorded</th>
                <th scope="col" className="p-3">Record</th>
              </tr>
            </thead>
            <tbody>
              {vitals.map((vital, index) => {
                const wrong = vital.status === "entered_in_error";
                return (
                  <tr key={vital.id || index} className="border-b border-accent last:border-b-0">
                    <td className={wrong ? "p-3 text-muted line-through" : "p-3"}>{vitalLabel(vital.code)}</td>
                    <td className={wrong ? "p-3 text-muted line-through" : "p-3 font-medium"}>
                      {vital.value} {prettyUnit(vital.unit || VITAL_FIELDS.find((f) => f.code === vital.code)?.unit || "")}
                    </td>
                    <td className="p-3 text-muted">{showInstant(vital.recordedAt, timezone) || "—"}</td>
                    <td className="p-3">
                      {wrong ? (
                        <span className="flex flex-col gap-1">
                          <StatusBadge label={humanize(vital.status)} tone={clinicalTone(vital.status)} />
                          {vital.reason ? <span className="text-xs text-muted">{vital.reason}</span> : null}
                        </span>
                      ) : editable && vital.id ? (
                        <Button size="sm" variant="secondary" onClick={() => setTarget(vital)}>Entered in error</Button>
                      ) : (
                        <StatusBadge label={humanize(vital.status || "final")} tone={clinicalTone(vital.status || "final")} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editable ? (
        <div className="border border-ink bg-surface p-6">
          <h3 className="mb-1 font-headline text-xs font-semibold uppercase tracking-wider text-ink">Record vital signs</h3>
          <p className="mb-4 text-xs text-muted">Fill only the readings you took. Units are fixed. The server may refuse a value: its message appears under the box.</p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {VITAL_FIELDS.map((field) => (
              <TextField
                key={field.code}
                label={`${field.label} (${field.unit})`}
                inputMode="decimal"
                autoComplete="off"
                value={values[field.code] ?? ""}
                onChange={(event) => {
                  setValues((current) => ({ ...current, [field.code]: event.target.value }));
                  setErrors((current) => {
                    if (!(field.code in current)) return current;
                    const next = { ...current };
                    delete next[field.code];
                    return next;
                  });
                }}
                error={errors[field.code]}
              />
            ))}
          </div>
          <div className="mt-5">
            <Button onClick={submit} loading={busy}>Record vital signs</Button>
          </div>
        </div>
      ) : null}

      <ReasonDialog
        open={target !== null}
        title="Mark this measurement as entered in error?"
        description="It is never deleted: it stays on the record together with your reason."
        confirmLabel="Mark as entered in error"
        onSubmit={submitError}
        onClose={() => setTarget(null)}
      />
    </div>
  );
}