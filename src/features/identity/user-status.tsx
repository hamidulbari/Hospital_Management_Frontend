"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-provider";
import { redirectIfExpired } from "@/lib/session-expired";
import { setUserStatusAction } from "./actions";

export function UserStatus({ userId, status, isSelf }: { userId: string; status: string; isSelf: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const disabled = status === "disabled";

  if (isSelf) return <span className="text-xs text-muted">You cannot disable your own account.</span>;

  async function confirm() {
    setBusy(true);
    const response = await setUserStatusAction(userId, disabled ? "active" : "disabled");
    setBusy(false);
    setOpen(false);
    if (response.ok) {
      toast.success(disabled ? "User enabled." : "User disabled and signed out everywhere.");
      router.refresh();
      return;
    }
    if (redirectIfExpired(response.error)) return;
    toast.fromError(response.error, { useFieldMessage: true });
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>{disabled ? "Enable user" : "Disable user"}</Button>
      <ConfirmDialog
        open={open}
        title={disabled ? "Enable this user?" : "Disable this user?"}
        description={disabled ? "The user can sign in again with their password." : "The user is signed out everywhere at once and cannot sign in until you enable them again."}
        confirmLabel={disabled ? "Enable user" : "Disable user"}
        busy={busy}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}