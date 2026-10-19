"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SelectField, type Option } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast-provider";
import { labelFor } from "@/features/patients/options";
import { redirectIfExpired } from "@/lib/session-expired";
import { createDepartmentAction, updateDepartmentAction } from "./actions";
import { ACTIVE_STATUS_OPTIONS, DEPARTMENT_TYPE_OPTIONS, activeTone } from "./options";
import type { DepartmentItem } from "./parse";

type Target = "new" | DepartmentItem | null;
type Props = { items: DepartmentItem[]; branches: Option[]; parents: Option[]; canManage: boolean };

function DepartmentForm({ department, branches, parents, onClose, onDone }: { department: DepartmentItem | null; branches: Option[]; parents: Option[]; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [code, setCode] = useState("");
  const [name, setName] = useState(department?.name ?? "");
  const [type, setType] = useState(department?.type ?? "");
  const [status, setStatus] = useState(department?.status || "active");
  const [branch, setBranch] = useState("");
  const [parent, setParent] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    const problems: Record<string, string> = {};
    if (!department && !code.trim()) problems.code = "Enter a code.";
    if (!name.trim()) problems.name = "Enter a name.";
    if (!type) problems.type = "Choose a type.";
    if (Object.keys(problems).length > 0) {
      setErrors(problems);
      toast.error("Please correct the highlighted fields.");
      return;
    }
    setBusy(true);
    const response = department
      ? await updateDepartmentAction(department.id, { name, type, status })
      : await createDepartmentAction({ code, name, type, branch_id: branch, parent_id: parent });
    setBusy(false);
    if (response.ok) {
      toast.success(department ? "Department updated." : "Department added.");
      onDone();
      return;
    }
    if (redirectIfExpired(response.error)) return;
    setErrors(response.error.fieldErrors);
    toast.fromError(response.error, { useFieldMessage: true });
  }

  return (
    <div className="flex flex-col gap-5">
      {department ? (
        <p className="text-sm text-ink">Code: <span className="font-semibold">{department.code}</span></p>
      ) : (
        <TextField label="Code *" autoComplete="off" maxLength={30} value={code} onChange={(e) => setCode(e.target.value)} error={errors.code} />
      )}
      <TextField label="Name *" autoComplete="off" maxLength={200} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
      <SelectField label="Type *" options={DEPARTMENT_TYPE_OPTIONS} value={type} onChange={setType} error={errors.type} />
      {department ? (
        <SelectField label="Status" options={ACTIVE_STATUS_OPTIONS} value={status} onChange={setStatus} error={errors.status} />
      ) : (
        <>
          {branches.length > 0 ? <SelectField label="Branch" options={branches} value={branch} onChange={setBranch} allowEmpty emptyLabel="None" error={errors.branch_id} /> : null}
          {parents.length > 0 ? <SelectField label="Parent department" options={parents} value={parent} onChange={setParent} allowEmpty emptyLabel="None" error={errors.parent_id} /> : null}
        </>
      )}
      {department ? <p className="text-xs text-muted">The branch and the parent department cannot be changed here.</p> : null}
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={busy}>Close</Button>
        <Button onClick={submit} loading={busy}>{department ? "Save changes" : "Add department"}</Button>
      </div>
    </div>
  );
}

export function DepartmentsPanel({ items, branches, parents, canManage }: Props) {
  const router = useRouter();
  const [target, setTarget] = useState<Target>(null);

  return (
    <>
      {canManage ? (
        <div className="mb-4">
          <Button onClick={() => setTarget("new")}>Add department</Button>
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-muted">No departments yet.</p>
      ) : (
        <div className="overflow-x-auto border border-ink bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink font-headline text-xs uppercase tracking-wider">
              <tr>
                <th scope="col" className="p-3">Code</th>
                <th scope="col" className="p-3">Name</th>
                <th scope="col" className="p-3">Type</th>
                <th scope="col" className="p-3">Branch</th>
                <th scope="col" className="p-3">Parent</th>
                <th scope="col" className="p-3">Status</th>
                {canManage ? <th scope="col" className="p-3"><span className="sr-only">Edit</span></th> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((department) => (
                <tr key={department.id} className="border-b border-accent last:border-b-0 hover:bg-section-soft">
                  <td className="p-3 font-medium">{department.code}</td>
                  <td className="p-3">{department.name}</td>
                  <td className="p-3">{department.type ? labelFor(DEPARTMENT_TYPE_OPTIONS, department.type) : "\u2014"}</td>
                  <td className="p-3">{department.branchName || "\u2014"}</td>
                  <td className="p-3">{department.parentName || "\u2014"}</td>
                  <td className="p-3"><StatusBadge label={labelFor(ACTIVE_STATUS_OPTIONS, department.status)} tone={activeTone(department.status)} /></td>
                  {canManage ? <td className="p-3 text-right"><Button size="sm" variant="secondary" onClick={() => setTarget(department)}>Edit</Button></td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={target !== null} title={target === "new" ? "Add department" : "Edit department"} onClose={() => setTarget(null)}>
        {target !== null ? (
          <DepartmentForm
            department={target === "new" ? null : target}
            branches={branches}
            parents={parents}
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