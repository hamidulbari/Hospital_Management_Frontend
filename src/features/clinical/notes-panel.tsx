"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { useToast } from "@/components/ui/toast-provider";
import { redirectIfExpired } from "@/lib/session-expired";
import { createNoteAction } from "./actions";
import { NoteCard } from "./note-card";
import { NOTE_TYPE_OPTIONS } from "./options";
import type { NoteItem } from "./parse";

type Props = { encounterId: string; notes: NoteItem[]; open: boolean; canWrite: boolean; canSign: boolean; timezone: string | null };

export function NotesPanel({ encounterId, notes, open, canWrite, canSign, timezone }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [type, setType] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<{ type?: string; body?: string }>({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    const problems: { type?: string; body?: string } = {};
    if (!type) problems.type = "Choose a note type.";
    if (!body.trim()) problems.body = "Write something first.";
    if (problems.type || problems.body) {
      setErrors(problems);
      toast.error("Please complete the highlighted fields.");
      return;
    }

    setBusy(true);
    const response = await createNoteAction(encounterId, { note_type: type, body });
    setBusy(false);
    if (response.ok) {
      toast.success("Draft saved. Sign it when it is ready.");
      setType("");
      setBody("");
      setErrors({});
      router.refresh();
      return;
    }
    if (redirectIfExpired(response.error)) return;
    setErrors({ type: response.error.fieldErrors.note_type, body: response.error.fieldErrors.body });
    toast.fromError(response.error, { useFieldMessage: true });
  }

  return (
    <div className="flex flex-col gap-6">
      {notes.length === 0 ? <p className="text-sm text-muted">No notes yet.</p> : null}
      {notes.map((note, index) => (
        <NoteCard
          key={`${note.id}:${note.draft ? (note.draft.id || "draft") : "none"}:${note.signed ? "signed" : "unsigned"}-${index}`}
          note={note}
          open={open}
          canWrite={canWrite}
          canSign={canSign}
          timezone={timezone}
        />
      ))}

      {canWrite && open ? (
        <div className="border border-ink bg-surface p-6">
          <h3 className="mb-4 font-headline text-xs font-semibold uppercase tracking-wider text-ink">New note</h3>
          <div className="flex flex-col gap-5">
            <div className="max-w-xs">
              <SelectField label="Note type *" options={NOTE_TYPE_OPTIONS} value={type} onChange={setType} error={errors.type} />
            </div>
            <TextareaField label="Note *" value={body} onChange={setBody} rows={8} maxLength={20000} error={errors.body} hint="Saved as a draft that only you can see until you sign it." />
            <div>
              <Button onClick={submit} loading={busy}>Save as draft</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}