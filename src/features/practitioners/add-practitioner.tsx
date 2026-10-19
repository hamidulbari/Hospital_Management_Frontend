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
import { createPractitionerAction } from "./actions";
import { PRACTITIONER_TYPE_OPTIONS } from "./options";

function AddForm({ departments, users, onClose }: { departments: Option[]; users: Option[]; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState("doctor");
  const [department, setDepartment] = useState("");
  const [user, setUser] = useState("");
  const [joined, setJoined] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) {
      setErrors({ full_name: "Enter the name." });
      toast.error("Please correct the highlighted fields.");
      return;
    }
    setBusy(true);
    const response = await createPractitionerAction({
      full_name: name,
      practitioner_type: type,
      primary_department_id: department,
      user_id: user,
      joined_on: joined,
    });
    setBusy(false);

    if (response.ok) {
      toast.success("Practitioner added. Now set the working hours.");
      router.push(`/admin/practitioners/${response.data.id}`);
      return;
    }
    if (redirectIfExpired(response.error)) return;
    setErrors(response.error.fieldErrors);
    toast.fromError(response.error, { useFieldMessage: true });
  }

  return (
    <div className="flex flex-col gap-5">
      <TextField label="Full name *" autoComplete="off" maxLength={200} value={name} onChange={(e) => setName(e.target.value)} error={errors.full_name} />
      <SelectField label="Type *" options={PRACTITIONER_TYPE_OPTIONS} value={type} onChange={setType} error={errors.practitioner_type} />
      {departments.length > 0 ? (
        <SelectField label="Primary department" options={departments} value={department} onChange={setDepartment} allowEmpty emptyLabel="None" error={errors.primary_department_id} />
      ) : null}
      {users.length > 0 ? (
        <SelectField
          label="Login account"
          options={users}
          value={user}
          onChange={setUser}
          allowEmpty
          emptyLabel="Not linked"
          error={errors.user_id}
          hint="A doctor needs a linked login to start consultations. One login can have only one profile."
        />
      ) : null}
      <DateField label="Joined on" value={joined} onChange={setJoined} disableFuture={false} minYear={2000} error={errors.joined_on} />
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={busy}>Close</Button>
        <Button onClick={submit} loading={busy}>Add practitioner</Button>
      </div>
    </div>
  );
}

export function AddPractitioner({ departments, users }: { departments: Option[]; users: Option[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Add practitioner</Button>
      <Modal open={open} title="Add practitioner" onClose={() => setOpen(false)}>
        <AddForm departments={departments} users={users} onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}