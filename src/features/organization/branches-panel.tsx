"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { Modal } from "@/components/ui/modal";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast-provider";
import { labelFor } from "@/features/patients/options";
import { redirectIfExpired } from "@/lib/session-expired";
import { createBranchAction, updateBranchAction } from "./actions";
import { ACTIVE_STATUS_OPTIONS, activeTone } from "./options";
import type { BranchItem } from "./parse";

type Target = "new" | BranchItem | null;

function BranchForm({ branch, onClose, onDone }: { branch: BranchItem | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [v, setV] = useState<Record<string, string>>({
    code: "",
    name: branch?.name ?? "",
    address_line1: branch?.line1 ?? "",
    address_line2: branch?.line2 ?? "",
    city: branch?.city ?? "",
    state: branch?.state ?? "",
    pincode: branch?.pincode ?? "",
    phone: branch?.phone ?? "",
    status: branch?.status || "active",
  });
  const [isMain, setIsMain] = useState(branch?.isMain ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const set = (key: string, value: string) => setV((c) => ({ ...c, [key]: value }));

  async function submit() {
    const problems: Record<string, string> = {};
    if (!branch && !v.code.trim()) problems.code = "Enter a code.";
    if (!v.name.trim()) problems.name = "Enter a name.";
    if (Object.keys(problems).length > 0) {
      setErrors(problems);
      toast.error("Please correct the highlighted fields.");
      return;
    }
    setBusy(true);
    const { code, status, ...rest } = v;
    const response = branch
      ? await updateBranchAction(branch.id, { ...rest, is_main: isMain, status })
      : await createBranchAction({ code, ...rest, is_main: isMain });
    setBusy(false);
    if (response.ok) {
      toast.success(branch ? "Branch updated." : "Branch added.");
      onDone();
      return;
    }
    if (redirectIfExpired(response.error)) return;
    setErrors(response.error.fieldErrors);
    toast.fromError(response.error, { useFieldMessage: true });
  }

  const field = (key: string, label: string, maxLength: number) => (
    <TextField label={label} autoComplete="off" maxLength={maxLength} value={v[key]} onChange={(e) => set(key, e.target.value)} error={errors[key]} />
  );

  return (
    <div className="flex flex-col gap-5">
      {branch ? <p className="text-sm text-ink">Code: <span className="font-semibold">{branch.code}</span></p> : field("code", "Code *", 30)}
      {field("name", "Name *", 200)}
      {field("address_line1", "Address line 1", 200)}
      {field("address_line2", "Address line 2", 200)}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {field("city", "City", 100)}
        {field("state", "State", 100)}
        {field("pincode", "Pincode", 10)}
      </div>
      {field("phone", "Phone", 30)}
      <CheckboxField label="This is the main branch" checked={isMain} onChange={(e) => setIsMain(e.target.checked)} />
      {branch ? <SelectField label="Status" options={ACTIVE_STATUS_OPTIONS} value={v.status} onChange={(value) => set("status", value)} error={errors.status} /> : null}
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={busy}>Close</Button>
        <Button onClick={submit} loading={busy}>{branch ? "Save changes" : "Add branch"}</Button>
      </div>
    </div>
  );
}

export function BranchesPanel({ items, canManage }: { items: BranchItem[]; canManage: boolean }) {
  const router = useRouter();
  const [target, setTarget] = useState<Target>(null);

  return (
    <>
      {canManage ? (
        <div className="mb-4">
          <Button onClick={() => setTarget("new")}>Add branch</Button>
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-muted">No branches yet.</p>
      ) : (
        <div className="overflow-x-auto border border-ink bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink font-headline text-xs uppercase tracking-wider">
              <tr>
                <th scope="col" className="p-3">Code</th>
                <th scope="col" className="p-3">Name</th>
                <th scope="col" className="p-3">City</th>
                <th scope="col" className="p-3">Phone</th>
                <th scope="col" className="p-3">Main</th>
                <th scope="col" className="p-3">Status</th>
                {canManage ? <th scope="col" className="p-3"><span className="sr-only">Edit</span></th> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((branch) => (
                <tr key={branch.id} className="border-b border-accent last:border-b-0 hover:bg-section-soft">
                  <td className="p-3 font-medium">{branch.code}</td>
                  <td className="p-3">{branch.name}</td>
                  <td className="p-3">{branch.city || "\u2014"}</td>
                  <td className="p-3">{branch.phone || "\u2014"}</td>
                  <td className="p-3">{branch.isMain ? "Yes" : "\u2014"}</td>
                  <td className="p-3"><StatusBadge label={labelFor(ACTIVE_STATUS_OPTIONS, branch.status)} tone={activeTone(branch.status)} /></td>
                  {canManage ? <td className="p-3 text-right"><Button size="sm" variant="secondary" onClick={() => setTarget(branch)}>Edit</Button></td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={target !== null} title={target === "new" ? "Add branch" : "Edit branch"} onClose={() => setTarget(null)}>
        {target !== null ? (
          <BranchForm
            branch={target === "new" ? null : target}
            onClose={() => setTarget(null)}
            onDone={() => {
              setTarget(null);
              router.refresh();
            }}
          />
        ) : null}
      </Modal>
    </>
  );
}