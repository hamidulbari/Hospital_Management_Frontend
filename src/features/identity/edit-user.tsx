"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast-provider";
import { redirectIfExpired } from "@/lib/session-expired";
import { updateUserAction } from "./actions";
import type { UserItem } from "./parse";

function EditForm({ user, onClose }: { user: UserItem; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) {
      setErrors({ full_name: "Enter the name." });
      toast.error("Please correct the highlighted fields.");
      return;
    }
    setBusy(true);
    const response = await updateUserAction(user.id, { full_name: name, phone });
    setBusy(false);
    if (response.ok) {
      toast.success("User updated.");
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
      <TextField label="Phone" inputMode="tel" autoComplete="off" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />
      <p className="text-xs text-muted">The email cannot be changed here.</p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={busy}>Close</Button>
        <Button onClick={submit} loading={busy}>Save changes</Button>
      </div>
    </div>
  );
}

export function EditUser({ user }: { user: UserItem }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>Edit user</Button>
      <Modal open={open} title="Edit user" onClose={() => setOpen(false)}>
        <EditForm user={user} onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}