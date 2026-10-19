"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-provider";
import { redirectIfExpired } from "@/lib/session-expired";
import { finishEncounterAction } from "./actions";

export function FinishEncounter({ encounterId, appointmentId }: { encounterId: string; appointmentId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  async function finish() {
    setBusy(true);
    const response = await finishEncounterAction(encounterId, appointmentId);
    setBusy(false);
    setConfirm(false);
    if (response.ok) {
      toast.success("Encounter finished.");
      if (response.data.warning) toast.error(`The appointment could not be marked as completed: ${response.data.warning}`);
      router.refresh();
      return;
    }
    if (redirectIfExpired(response.error)) return;
    // For example: "refused while unsigned note drafts exist". The server's words are shown as they are.
    toast.fromError(response.error, { useFieldMessage: true });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border border-ink bg-surface p-6">
      <p className="max-w-xl text-sm text-muted">
        Finishing closes the encounter: nothing more can be added. It is refused while a note draft is still unsigned.
      </p>
      <Button onClick={() => setConfirm(true)}>Finish encounter</Button>
      <ConfirmDialog
        open={confirm}
        title="Finish this encounter?"
        description="Sign or delete every draft first. After this, vital signs, notes and diagnoses can no longer be added."
        confirmLabel="Finish encounter"
        busy={busy}
        onConfirm={finish}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
}