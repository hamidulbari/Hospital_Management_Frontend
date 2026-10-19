"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast-provider";
import { redirectIfExpired } from "@/lib/session-expired";
import { createSpecializationAction, setSpecializationsAction } from "./actions";
import type { SpecItem, SpecOption } from "./parse";

type Props = { practitionerId: string; current: SpecItem[]; all: SpecOption[]; canManage: boolean };

function EditBody({ practitionerId, current, all, onClose }: Omit<Props, "canManage"> & { onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [chosen, setChosen] = useState<Record<string, boolean>>(() => Object.fromEntries(current.map((s) => [s.id, s.isPrimary])));
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [newErrors, setNewErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  async function save() {
    setBusy(true);
    const response = await setSpecializationsAction(practitionerId, {
      specializations: Object.entries(chosen).map(([id, primary]) => ({ id, is_primary: primary })),
    });
    setBusy(false);
    if (response.ok) {
      toast.success("Specializations saved.");
      onClose();
      router.refresh();
      return;
    }
    if (redirectIfExpired(response.error)) return;
    toast.fromError(response.error, { useFieldMessage: true });
  }

  async function addNew() {
    setAdding(true);
    const response = await createSpecializationAction({ code, name });
    setAdding(false);
    if (response.ok) {
      toast.success("Specialization added. It is in the list now.");
      setCode("");
      setName("");
      setNewErrors({});
      router.refresh();
      return;
    }
    if (redirectIfExpired(response.error)) return;
    setNewErrors(response.error.fieldErrors);
    toast.fromError(response.error, { useFieldMessage: true });
  }

  function makePrimary(id: string) {
    setChosen((c) => Object.fromEntries(Object.keys(c).map((key) => [key, key === id])));
  }

  return (
    <div className="flex flex-col gap-5">
      {all.length === 0 ? <p className="text-sm text-muted">No specializations exist yet. Add one below.</p> : null}
      <ul className="max-h-72 overflow-auto border border-ink">
        {all.map((spec) => {
          const on = spec.id in chosen;
          return (
            <li key={spec.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-accent p-3 last:border-b-0">
              <CheckboxField
                label={spec.name}
                checked={on}
                onChange={() =>
                  setChosen((c) => {
                    const next = { ...c };
                    if (on) delete next[spec.id];
                    else next[spec.id] = false;
                    return next;
                  })
                }
              />
              {on ? (
                chosen[spec.id] ? (
                  <StatusBadge label="Primary" tone="strong" />
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => makePrimary(spec.id)}>Make primary</Button>
                )
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="border border-ink p-4">
        <p className="mb-3 font-headline text-xs font-semibold uppercase tracking-wider text-ink">New specialization</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
          <div className="sm:col-span-4">
            <TextField label="Code" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} error={newErrors.code} />
          </div>
          <div className="sm:col-span-8">
            <TextField label="Name" autoComplete="off" maxLength={150} value={name} onChange={(e) => setName(e.target.value)} error={newErrors.name} />
          </div>
        </div>
        <div className="mt-3">
          <Button size="sm" variant="secondary" loading={adding} onClick={addNew}>Add to the list</Button>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={busy}>Close</Button>
        <Button onClick={save} loading={busy}>Save specializations</Button>
      </div>
    </div>
  );
}

export function SpecializationsPanel({ practitionerId, current, all, canManage }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      {current.length === 0 ? (
        <p className="text-sm text-muted">No specializations.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {current.map((spec, index) => (
            <li key={spec.id || index}>
              <StatusBadge label={spec.isPrimary ? `${spec.name} (primary)` : spec.name} tone={spec.isPrimary ? "strong" : "active"} />
            </li>
          ))}
        </ul>
      )}
      {canManage ? <Button variant="secondary" onClick={() => setOpen(true)}>Edit specializations</Button> : null}
      <Modal open={open} title="Specializations" onClose={() => setOpen(false)}>
        <EditBody practitionerId={practitionerId} current={current} all={all} onClose={() => setOpen(false)} />
      </Modal>
    </div>
  );
}