"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ReasonDialog } from "@/components/ui/reason-dialog";
import { useToast } from "@/components/ui/toast-provider";
import type { ClientError } from "@/lib/api/errors";
import { redirectIfExpired } from "@/lib/session-expired";
import { cancelInvoiceAction } from "./actions";

export function CancelInvoice({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);

  async function submit(reason: string): Promise<ClientError | null> {
    const response = await cancelInvoiceAction(invoiceId, { reason });
    if (response.ok) {
      toast.success("Invoice cancelled.");
      setOpen(false);
      router.refresh();
      return null;
    }
    if (redirectIfExpired(response.error)) return null;
    toast.fromError(response.error, { useFieldMessage: true });
    return response.error;
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>Cancel invoice</Button>
      <ReasonDialog
        open={open}
        title="Cancel this invoice?"
        description="The invoice and its number stay on record. It can only be cancelled while it has no active payment: reverse its payments first."
        confirmLabel="Cancel invoice"
        onSubmit={submit}
        onClose={() => setOpen(false)}
      />
    </>
  );
}