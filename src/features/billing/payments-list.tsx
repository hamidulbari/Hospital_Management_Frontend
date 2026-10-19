"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ReasonDialog } from "@/components/ui/reason-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast-provider";
import { labelFor } from "@/features/patients/options";
import type { ClientError } from "@/lib/api/errors";
import { humanize } from "@/lib/format";
import { showInstant } from "@/lib/format-instant";
import { useIdempotencyKey } from "@/lib/use-idempotency-key";
import { redirectIfExpired } from "@/lib/session-expired";
import { reversePaymentAction } from "./actions";
import { fmt, type MoneyFormat } from "./money-format";
import { PAYMENT_METHOD_OPTIONS, invoiceTone } from "./options";
import type { PaymentItem } from "./parse";

type Props = { payments: PaymentItem[]; canReverse: boolean; moneyFormat: MoneyFormat; timezone: string | null };

export function PaymentsList({ payments, canReverse, moneyFormat, timezone }: Props) {
  const router = useRouter();
  const toast = useToast();
  const attempt = useIdempotencyKey();
  const [target, setTarget] = useState<PaymentItem | null>(null);

  async function submit(reason: string): Promise<ClientError | null> {
    if (!target) return null;
    const key = attempt.keyFor(`${target.id}|${reason}`);
    const response = await reversePaymentAction(target.id, { reason }, key);
    if (response.ok) {
      toast.success("Payment reversed.");
      attempt.reset();
      setTarget(null);
      router.refresh();
      return null;
    }
    if (redirectIfExpired(response.error)) return null;
    if (response.error.status >= 400 && response.error.status < 500) attempt.reset();
    toast.fromError(response.error, { useFieldMessage: true });
    return response.error;
  }

  if (payments.length === 0) return <p className="text-sm text-muted">No payments recorded.</p>;

  return (
    <>
      <div className="overflow-x-auto border border-ink bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink font-headline text-xs uppercase tracking-wider">
            <tr>
              <th scope="col" className="p-3">Receipt</th>
              <th scope="col" className="p-3">Method</th>
              <th scope="col" className="p-3 text-right">Amount</th>
              <th scope="col" className="p-3">Date</th>
              <th scope="col" className="p-3">Status</th>
              <th scope="col" className="p-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment, index) => {
              const reversed = payment.status === "reversed";
              return (
                <tr key={payment.id || index} className="border-b border-accent align-top last:border-b-0">
                  <td className="p-3 font-medium">{payment.receipt || "—"}</td>
                  <td className="p-3">
                    {payment.method ? labelFor(PAYMENT_METHOD_OPTIONS, payment.method) : "—"}
                    {payment.reference ? <span className="block text-xs text-muted">{payment.reference}</span> : null}
                  </td>
                  <td className={reversed ? "p-3 text-right text-muted line-through" : "p-3 text-right font-medium"}>{fmt(payment.amount, moneyFormat)}</td>
                  <td className="p-3 text-muted">{showInstant(payment.at, timezone) || "—"}</td>
                  <td className="p-3">
                    <StatusBadge label={humanize(payment.status || "posted")} tone={invoiceTone(payment.status || "posted")} />
                    {reversed && payment.reason ? <span className="mt-1 block text-xs text-muted">{payment.reason}</span> : null}
                  </td>
                  <td className="p-3 text-right">
                    {canReverse && !reversed && payment.id ? (
                      <Button size="sm" variant="secondary" onClick={() => setTarget(payment)}>Reverse</Button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ReasonDialog
        open={target !== null}
        title="Reverse this payment?"
        description="The payment stays on record as reversed, together with your reason. The invoice goes back to what is really paid."
        confirmLabel="Reverse payment"
        onSubmit={submit}
        onClose={() => setTarget(null)}
      />
    </>
  );
}