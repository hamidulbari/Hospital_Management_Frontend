"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextareaField } from "@/components/ui/textarea-field";
import { useToast } from "@/components/ui/toast-provider";
import type { ClientError } from "@/lib/api/errors";
import { showInstant } from "@/lib/format-instant";
import { labelFor } from "@/features/patients/options";
import { redirectIfExpired } from "@/lib/session-expired";
import { amendNoteAction, deleteNoteAction, saveDraftAction, signNoteAction } from "./actions";
import { AmendDialog, HistoryDialog } from "./note-dialogs";
import { NOTE_TYPE_OPTIONS } from "./options";
import type { NoteItem } from "./parse";

type Props = { note: NoteItem; open: boolean; canWrite: boolean; canSign: boolean; timezone: string | null };

export function NoteCard({ note, open, canWrite, canSign, timezone }: Props) {
  const router = useRouter();
  const toast = useToast();
  const savedText = note.draft?.body ?? "";
  const [text, setText] = useState(savedText);
  const [busy, setBusy] = useState<"save" | "sign" | "delete" | null>(null);
  const [confirm, setConfirm] = useState<"sign" | "delete" | null>(null);
  const [amendOpen, setAmendOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const dirty = text !== savedText;

  /** Runs an action and shows the result. Returns true on success. */
  async function run(kind: "save" | "sign" | "delete", call: () => Promise<{ ok: true } | { ok: false; error: ClientError }>, done: string) {
    setBusy(kind);
    const response = await call();
    setBusy(null);
    setConfirm(null);
    if (response.ok) {
      toast.success(done);
      router.refresh();
      return;
    }
    if (redirectIfExpired(response.error)) return;
    toast.fromError(response.error, { useFieldMessage: true });
  }

  async function submitAmend(reason: string, body: string): Promise<ClientError | null> {
    const response = await amendNoteAction(note.id, { reason, body });
    if (response.ok) {
      toast.success("Amendment draft created.");
      setAmendOpen(false);
      router.refresh();
      return null;
    }
    if (redirectIfExpired(response.error)) return null;
    toast.fromError(response.error, { useFieldMessage: true });
    return response.error;
  }

  return (
    <article className="border border-ink bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink px-5 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-headline text-sm font-bold uppercase tracking-wider text-ink">
            {labelFor(NOTE_TYPE_OPTIONS, note.noteType)}
          </h3>
          {note.signed ? <StatusBadge label="Signed" tone="strong" /> : null}
          {note.draft ? <StatusBadge label="Your draft" tone="active" /> : null}
        </div>
        <Button size="sm" variant="secondary" onClick={() => setHistoryOpen(true)}>History</Button>
      </header>

      <div className="flex flex-col gap-5 p-5">
        {note.signed ? (
          <div>
            <p className="mb-2 text-xs text-muted">
              Signed{note.signed.signedAt ? ` ${showInstant(note.signed.signedAt, timezone)}` : ""}
              {note.signed.author ? ` by ${note.signed.author}` : ""}. It cannot be edited.
            </p>
            {/* Read only on purpose: a signed note is never shown in an edit box. */}
            <p className="whitespace-pre-wrap border border-accent bg-background p-4 text-sm text-ink">{note.signed.body}</p>
            {canWrite && open && !note.draft ? (
              <div className="mt-3">
                <Button size="sm" variant="secondary" onClick={() => setAmendOpen(true)}>Amend</Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {note.draft ? (
          <div className="flex flex-col gap-3">
            {canWrite && open ? (
              <>
                <TextareaField label="Draft (only you can see it)" value={text} onChange={setText} rows={8} maxLength={20000} />
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="secondary"
                    loading={busy === "save"}
                    disabled={!dirty || busy !== null}
                    onClick={() => run("save", () => saveDraftAction(note.id, { body: text }), "Draft saved.")}
                  >
                    Save draft
                  </Button>
                  {canSign ? (
                    <Button disabled={dirty || busy !== null || !savedText.trim()} onClick={() => setConfirm("sign")}>
                      Sign
                    </Button>
                  ) : null}
                  {!note.signed ? (
                    <Button variant="secondary" disabled={busy !== null} onClick={() => setConfirm("delete")}>
                      Delete draft
                    </Button>
                  ) : null}
                </div>
                {dirty ? <p className="text-xs text-muted">Save the draft before signing.</p> : null}
              </>
            ) : (
              <p className="whitespace-pre-wrap border border-accent bg-background p-4 text-sm text-ink">{note.draft.body}</p>
            )}
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirm === "sign"}
        title="Sign this note?"
        description="After signing, the text can never be changed. If you need to correct it later, you can only amend it with a reason."
        confirmLabel="Sign note"
        busy={busy === "sign"}
        onConfirm={() => run("sign", () => signNoteAction(note.id), "Note signed.")}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        title="Delete this draft?"
        description="The draft is removed. A note that was never signed can be deleted: a signed one never can."
        confirmLabel="Delete draft"
        busy={busy === "delete"}
        onConfirm={() => run("delete", () => deleteNoteAction(note.id), "Draft deleted.")}
        onCancel={() => setConfirm(null)}
      />
      <AmendDialog open={amendOpen} initialBody={note.signed?.body ?? ""} onSubmit={submitAmend} onClose={() => setAmendOpen(false)} />
      <HistoryDialog open={historyOpen} noteId={note.id} timezone={timezone} onClose={() => setHistoryOpen(false)} />
    </article>
  );
}