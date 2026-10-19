"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Modal } from "@/components/ui/modal";
import { SelectField, type Option } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast-provider";
import { redirectIfExpired } from "@/lib/session-expired";
import { updatePractitionerAction } from "./actions";
import { PRACTITIONER_STATUS_OPTIONS } from "./options";
import type { PractitionerDetail } from "./parse";

function EditForm({ practitioner, departments, onClose }: { practitioner: PractitionerDetail; departments: Option[]; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(practitioner.name);
  const [status, setStatus] = useState(practitioner.status || "active");
  const [department, setDepartment] = useState(practitioner.departmentId);
  const [joined, setJoined] = useState(practitioner.joinedOn ?? "");
  const [left, setLeft] = useState(practitioner.leftOn ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) {
      setErrors({ full_name: "Enter the name." });
      toast.error("Please correct the highlighted fields.");
      return;
    }
    setBusy(true);
    const response = await updatePractitionerAction(practitioner.id, {
      full_name: name,
      status,
      joined_on: joined,
      left_on: left,
      ...(departments.length > 0 ? { primary_department_id: department } : {}),
    });
    setBusy(false);

    if (response.ok) {
      toast.success("Profile updated.");
      onClose();
      router.refresh();
      return;
    }
    if (redirectIfExpired(response.error)) return;
    setErrors(response.error.fieldErrors);
    toast.fromError(response.error, { useFieldMessage: true });
  }

  return (
    <div className="flex flex-col gap-5">
      <TextField label="Full name *" autoComplete="off" maxLength={200} value={name} onChange={(e) => setName(e.target.value)} error={errors.full_name} />
      <SelectField label="Status" options={PRACTITIONER_STATUS_OPTIONS} value={status} onChange={setStatus} error={errors.status} />
      {departments.length > 0 ? (
        <SelectField label="Primary department" options={departments} value={department} onChange={setDepartment} allowEmpty emptyLabel="None" error={errors.primary_department_id} />
      ) : null}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <DateField label="Joined on" value={joined} onChange={setJoined} disableFuture={false} minYear={2000} error={errors.joined_on} />
        <DateField label="Left on" value={left} onChange={setLeft} disableFuture={false} minYear={2000} error={errors.left_on} />
      </div>
      <p className="text-xs text-muted">The type and the login link cannot be changed here.</p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={busy}>Close</Button>
        <Button onClick={submit} loading={busy}>Save changes</Button>
      </div>
    </div>
  );
}

export function EditPractitioner({ practitioner, departments }: { practitioner: PractitionerDetail; departments: Option[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>Edit profile</Button>
      <Modal open={open} title="Edit profile" onClose={() => setOpen(false)}>
        <EditForm practitioner={practitioner} departments={departments} onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}