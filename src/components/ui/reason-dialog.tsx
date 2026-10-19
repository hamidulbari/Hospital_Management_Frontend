"use client";

import { useState } from "react";
import type { ClientError } from "@/lib/api/errors";
import { Button } from "./button";
import { Modal } from "./modal";
import { TextareaField } from "./textarea-field";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  maxLength?: number;
  /** Return null on success (the caller closes the dialog) or the error to show. */
  onSubmit: (reason: string) => Promise<ClientError | null>;
  onClose: () => void;
};

function ReasonForm({ description, confirmLabel, maxLength, onSubmit, onClose }: Omit<Props, "open" | "title">) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function submit() {
    const text = reason.trim();
    if (!text) {
      setError("Enter a reason.");
      return;
    }
    setBusy(true);
    setError(undefined);
    const failure = await onSubmit(text);
    setBusy(false);
    if (failure) setError(Object.values(failure.fieldErrors)[0] ?? failure.message);
  }

  return (
    <div className="flex flex-col gap-4">
      {description ? <p className="text-sm text-muted">{description}</p> : null}
      <TextareaField label="Reason *" value={reason} onChange={setReason} error={error} maxLength={maxLength} />
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={busy}>Close</Button>
        <Button variant="danger" onClick={submit} loading={busy}>{confirmLabel}</Button>
      </div>
    </div>
  );
}

export function ReasonDialog({ open, title, onClose, ...rest }: Props) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <ReasonForm {...rest} maxLength={rest.maxLength ?? 150} onClose={onClose} />
    </Modal>
  );
}