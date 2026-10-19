"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Option } from "@/components/ui/select-field";
import { useToast } from "@/components/ui/toast-provider";
import type { ClientError } from "@/lib/api/errors";
import { redirectIfExpired } from "@/lib/session-expired";
import { deleteDraftAction, issueInvoiceAction, replaceLinesAction } from "./actions";
import { LinesEditor } from "./lines-editor";
import type { ApiLine, LineDraft } from "./lines";

type Props = {
  invoiceId: string;
  initialLines: LineDraft[];
  services: Option[];
  canEdit: boolean;
  canIssue: boolean;
  canDiscount: boolean;
  canCustom: boolean;
};

export function DraftTools({ invoiceId, initialLines, services, canEdit, canIssue, canDiscount, canCustom }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<"issue" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveLines(lines: ApiLine[]): Promise<ClientError | null> {
    const response = await replaceLinesAction(invoiceId, { lines });
    if (response.ok) {
      toast.success("Lines saved. The totals were recalculated by the server.");
      setEditing(false);
      router.refresh();
      return null;
    }
    if (redirectIfExpired(response.error)) return null;
    toast.fromError(response.error, { useFieldMessage: true });
    return response.error;
  }

  async function issue() {
    setBusy(true);
    const response = await issueInvoiceAction(invoiceId);
    setBusy(false);
    setConfirm(null);
    if (response.ok) {
      toast.success("Invoice issued.");
      router.refresh();
      return;
    }
    if (redirectIfExpired(response.error)) return;
    toast.fromError(response.error, { useFieldMessage: true });
  }

  async function remove() {
    setBusy(true);
    const response = await deleteDraftAction(invoiceId);
    setBusy(false);
    setConfirm(null);
    if (response.ok) {
      toast.success("Draft deleted.");
      router.push("/billing");
      return;
    }
    if (redirectIfExpired(response.error)) return;
    toast.fromError(response.error, { useFieldMessage: true });
  }

  if (editing) {
    return (
      <LinesEditor
        services={services}
        canDiscount={canDiscount}
        canCustom={canCustom}
        initial={initialLines}
        submitLabel="Save lines"
        onSubmit={saveLines}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {canEdit ? <Button variant="secondary" onClick={() => setEditing(true)}>Edit lines</Button> : null}
      {canIssue ? <Button onClick={() => setConfirm("issue")}>Issue invoice</Button> : null}
      {canEdit ? <Button variant="secondary" onClick={() => setConfirm("delete")}>Delete draft</Button> : null}

      <ConfirmDialog
        open={confirm === "issue"}
        title="Issue this invoice?"
        description="Issuing gives the invoice its number and freezes it. Its lines can no longer be changed."
        confirmLabel="Issue invoice"
        busy={busy}
        onConfirm={issue}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        title="Delete this draft?"
        description="Only a draft can be deleted. An issued invoice is cancelled instead, never deleted."
        confirmLabel="Delete draft"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}