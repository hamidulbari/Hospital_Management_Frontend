"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PasswordField } from "@/components/ui/password-field";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast-provider";
import { redirectIfExpired } from "@/lib/session-expired";
import { createUserAction } from "./actions";
import { generatePassword } from "./password";

function AddForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      toast.success("Password copied.");
    } catch {
      toast.error("Could not copy. Select the password and copy it by hand.");
    }
  }

  async function submit() {
    const problems: Record<string, string> = {};
    if (!name.trim()) problems.full_name = "Enter the name.";
    if (!email.trim()) problems.email = "Enter the email.";
    if (!password) problems.password = "Enter a temporary password, or generate one.";
    if (Object.keys(problems).length > 0) {
      setErrors(problems);
      toast.error("Please correct the highlighted fields.");
      return;
    }

    setBusy(true);
    const response = await createUserAction({ full_name: name, email, phone, password });
    setBusy(false);

    if (response.ok) {
      toast.success("User created. Give them the temporary password: they must change it at the first sign-in.");
      router.push(`/admin/users/${response.data.id}`);
      return;
    }
    if (redirectIfExpired(response.error)) return;
    setErrors(response.error.fieldErrors);
    toast.fromError(response.error, { useFieldMessage: true });
  }

  return (
    <div className="flex flex-col gap-5">
      <TextField label="Full name *" autoComplete="off" maxLength={200} value={name} onChange={(e) => setName(e.target.value)} error={errors.full_name} />
      <TextField label="Email *" type="email" autoComplete="off" maxLength={190} value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} hint="This is the sign-in name. It cannot be changed later." />
      <TextField label="Phone" inputMode="tel" autoComplete="off" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />
      <PasswordField
        label="Temporary password *"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        hint="At least 12 characters with upper and lower case letters, a number and a symbol."
      />
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" size="sm" onClick={() => setPassword(generatePassword())}>Generate a strong password</Button>
        <Button variant="secondary" size="sm" disabled={!password} onClick={copy}>Copy password</Button>
      </div>
      <p className="text-xs text-muted">The password is shown only here. After you create the user it cannot be read again.</p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={busy}>Close</Button>
        <Button onClick={submit} loading={busy}>Create user</Button>
      </div>
    </div>
  );
}

export function AddUser() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Add user</Button>
      <Modal open={open} title="Add user" onClose={() => setOpen(false)}>
        <AddForm onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}