"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextareaField } from "@/components/ui/textarea-field";
import type { ClientError } from "@/lib/api/errors";
import { humanize } from "@/lib/format";
import { showInstant } from "@/lib/format-instant";
import { redirectIfExpired } from "@/lib/session-expired";
import { loadVersionsAction } from "./actions";
import { clinicalTone } from "./options";
import type { NoteVersion } from "./parse";

// ---------- Amend ----------

type AmendProps = {
  open: boolean;
  initialBody: string;
  onSubmit: (reason: string, body: string) => Promise<ClientError | null>;
  onClose: () => void;
};

function AmendBody({ initialBody, onSubmit, onClose }: Omit<AmendProps, "open">) {
  const [reason, setReason] = useState("");
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<{ reason?: string; body?: string }>({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!reason.trim()) {
      setError({ reason: "Enter a reason." });
      return;
    }
    setBusy(true);
    setError({});
    const failure = await onSubmit(reason.trim(), body);
    setBusy(false);
    if (failure) {
      setError({
        reason: failure.fieldErrors.reason,
        body: failure.fieldErrors.body ?? (failure.fieldErrors.reason ? undefined : failure.message),
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        The signed text stays what readers see until you sign the amendment. Change the text below, then sign it from the draft.
      </p>
      <TextareaField label="Reason for the amendment *" value={reason} onChange={setReason} maxLength={255} error={error.reason} />
      <TextareaField label="Amended text" value={body} onChange={setBody} rows={10} error={error.body} />
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={busy}>Close</Button>
        <Button onClick={submit} loading={busy}>Create amendment draft</Button>
      </div>
    </div>
  );
}

export function AmendDialog({ open, onClose, ...rest }: AmendProps) {
  return (
    <Modal open={open} title="Amend this signed note" size="lg" onClose={onClose}>
      <AmendBody {...rest} onClose={onClose} />
    </Modal>
  );
}

// ---------- History ----------

type HistoryState =
  | { status: "loading" }
  | { status: "ready"; versions: NoteVersion[] }
  | { status: "error"; message: string };

function HistoryBody({ noteId, timezone, onClose }: { noteId: string; timezone: string | null; onClose: () => void }) {
  const [state, setState] = useState<HistoryState>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    loadVersionsAction(noteId).then((response) => {
      if (!alive) return;
      if (response.ok) {
        setState({ status: "ready", versions: response.data });
        return;
      }
      if (redirectIfExpired(response.error)) return;
      setState({ status: "error", message: response.error.message });
    });
    return () => {
      alive = false;
    };
  }, [noteId]);

  return (
    <div className="flex flex-col gap-4">
      {state.status === "loading" ? <p role="status" className="text-sm text-muted">Loading history…</p> : null}
      {state.status === "error" ? <p role="alert" className="text-sm font-medium text-error">{state.message}</p> : null}
      {state.status === "ready" && state.versions.length === 0 ? <p className="text-sm text-muted">No versions found.</p> : null}
      {state.status === "ready" ? (
        <ul className="flex flex-col gap-3">
          {state.versions.map((version, index) => (
            <li key={version.id || index} className="border border-ink bg-surface p-4">
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                <span className="font-headline font-bold text-ink">Version {version.number || index + 1}</span>
                <StatusBadge label={humanize(version.status)} tone={clinicalTone(version.status)} />
                {version.signedAt ? <span>{showInstant(version.signedAt, timezone)}</span> : null}
                {version.author ? <span>{version.author}</span> : null}
              </div>
              {version.reason ? <p className="mt-2 text-xs text-muted">Reason: {version.reason}</p> : null}
              {version.body ? <p className="mt-3 whitespace-pre-wrap text-sm text-ink">{version.body}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex justify-end">
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

export function HistoryDialog({ open, noteId, timezone, onClose }: { open: boolean; noteId: string; timezone: string | null; onClose: () => void }) {
  return (
    <Modal open={open} title="Note history" size="lg" onClose={onClose}>
      <HistoryBody noteId={noteId} timezone={timezone} onClose={onClose} />
    </Modal>
  );
}