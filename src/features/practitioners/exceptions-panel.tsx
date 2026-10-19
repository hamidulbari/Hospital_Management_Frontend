"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DateField } from "@/components/ui/date-field";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextField } from "@/components/ui/text-field";
import { TimeField } from "@/components/ui/time-field";
import { useToast } from "@/components/ui/toast-provider";
import { labelFor } from "@/features/patients/options";
import { fieldErrorsFromZod } from "@/lib/api/invalid";
import { formatLocalDate } from "@/lib/datetime";
import { redirectIfExpired } from "@/lib/session-expired";
import { addExceptionAction, deleteExceptionAction } from "./actions";
import { EXCEPTION_KIND_OPTIONS } from "./options";
import type { ExceptionItem } from "./parse";
import { exceptionSchema } from "./schemas";

type Props = { practitionerId: string; exceptions: ExceptionItem[]; canManage: boolean };

export function ExceptionsPanel({ practitionerId, exceptions, canManage }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [date, setDate] = useState("");
  const [kind, setKind] = useState("blocked");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<ExceptionItem | null>(null);
  const [removing, setRemoving] = useState(false);

  async function submit() {
    const check = exceptionSchema.safeParse({ exception_date: date, kind, start_time: start, end_time: end, reason });
    if (!check.success) {
      setErrors(fieldErrorsFromZod(check.error));
      toast.error("Please correct the highlighted fields.");
      return;
    }
    setBusy(true);
    const response = await addExceptionAction(practitionerId, check.data);
    setBusy(false);
    if (response.ok) {
      toast.success(kind === "extra" ? "Extra hours added." : "Leave added.");
      setDate("");
      setStart("");
      setEnd("");
      setReason("");
      setErrors({});
      router.refresh();
      return;
    }
    if (redirectIfExpired(response.error)) return;
    setErrors(response.error.fieldErrors);
    toast.fromError(response.error, { useFieldMessage: true });
  }

  async function remove() {
    if (!target) return;
    setRemoving(true);
    const response = await deleteExceptionAction(practitionerId, target.id);
    setRemoving(false);
    setTarget(null);
    if (response.ok) {
      toast.success("Entry removed.");
      router.refresh();
      return;
    }
    if (redirectIfExpired(response.error)) return;
    toast.fromError(response.error, { useFieldMessage: true });
  }

  return (
    <div className="flex flex-col gap-6">
      {exceptions.length === 0 ? (
        <p className="text-sm text-muted">No leave or extra hours from today onwards.</p>
      ) : (
        <ul className="border border-ink bg-surface">
          {exceptions.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-accent p-4 last:border-b-0">
              <div>
                <p className="text-sm font-medium text-ink">
                  {formatLocalDate(item.date)}
                  {item.start && item.end ? ` · ${item.start}–${item.end}` : " · whole day"}
                </p>
                {item.reason ? <p className="text-xs text-muted">{item.reason}</p> : null}
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge label={item.kind === "extra" ? "Extra hours" : "Not available"} tone={item.kind === "extra" ? "info" : "bad"} />
                {canManage && item.id ? <Button size="sm" variant="secondary" onClick={() => setTarget(item)}>Remove</Button> : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <div className="border border-ink bg-surface p-6">
          <h3 className="mb-1 font-headline text-xs font-semibold uppercase tracking-wider text-ink">Add leave or extra hours</h3>
          <p className="mb-4 text-xs text-muted">Not available without times = the whole day. Extra hours need a start and an end time.</p>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
            <div className="md:col-span-3">
              <DateField label="Date *" value={date} onChange={setDate} disableFuture={false} minYear={2020} error={errors.exception_date} />
            </div>
            <div className="md:col-span-4">
              <SelectField label="Kind *" options={EXCEPTION_KIND_OPTIONS} value={kind} onChange={setKind} error={errors.kind} />
            </div>
            <div className="md:col-span-2">
              <TimeField label="From" value={start} onChange={setStart} error={errors.start_time} />
            </div>
            <div className="md:col-span-2">
              <TimeField label="To" value={end} onChange={setEnd} error={errors.end_time} />
            </div>
            <div className="md:col-span-12">
              <TextField label="Reason" autoComplete="off" maxLength={150} value={reason} onChange={(e) => setReason(e.target.value)} error={errors.reason} hint={`Optional. Currently: ${labelFor(EXCEPTION_KIND_OPTIONS, kind)}.`} />
            </div>
          </div>
          <div className="mt-5">
            <Button onClick={submit} loading={busy}>Add</Button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={target !== null}
        title="Remove this entry?"
        description="Removing leave makes those slots available again. Removing extra hours takes them away."
        confirmLabel="Remove"
        busy={removing}
        onConfirm={remove}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}