"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast-provider";
import { normalizeMoneyInput } from "@/lib/money";
import { useIdempotencyKey } from "@/lib/use-idempotency-key";
import { redirectIfExpired } from "@/lib/session-expired";
import { recordPaymentAction } from "./actions";
import { fmt, isZeroMoney, type MoneyFormat } from "./money-format";
import { METHODS_NEEDING_REFERENCE, PAYMENT_METHOD_OPTIONS } from "./options";

type Props = { invoiceId: string; balance: string; moneyFormat: MoneyFormat };

export function PaymentForm({ invoiceId, balance, moneyFormat }: Props) {
  const router = useRouter();
  const toast = useToast();
  const attempt = useIdempotencyKey();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const needsReference = METHODS_NEEDING_REFERENCE.includes(method);

  function clear(field: string) {
    setErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function submit() {
    const normalized = normalizeMoneyInput(amount);
    const problems: Record<string, string> = {};
    if (normalized === null || isZeroMoney(normalized)) problems.amount = "Enter an amount like 500.00 (at most two decimals, more than zero).";
    if (needsReference && !reference.trim()) problems.reference = "Enter the reference (for example the card, UPI or cheque number).";
    if (Object.keys(problems).length > 0 || normalized === null) {
      setErrors(problems);
      toast.error("Please correct the highlighted fields.");
      return;
    }

    setBusy(true);
    // Same request again (a retry) = same key = cannot pay twice. Any change = a new key.
    const key = attempt.keyFor(`${normalized}|${method}|${reference.trim()}`);
    const response = await recordPaymentAction(invoiceId, { amount: normalized, method, reference }, key);
    setBusy(false);

    if (response.ok) {
      toast.success("Payment recorded.");
      attempt.reset();
      setAmount("");
      setReference("");
      setErrors({});
      router.refresh();
      return;
    }
    if (redirectIfExpired(response.error)) return;
    // The server refused for a reason the person can fix: the next attempt is a new one.
    if (response.error.status >= 400 && response.error.status < 500) attempt.reset();
    setErrors(response.error.fieldErrors);
    toast.fromError(response.error, { useFieldMessage: true });
  }

  const balanceUsable = /^\d+\.\d{2}$/.test(balance) && !isZeroMoney(balance);

  return (
    <div className="border border-ink bg-surface p-6">
      <h3 className="mb-1 font-headline text-xs font-semibold uppercase tracking-wider text-ink">Record a payment</h3>
      <p className="mb-4 text-xs text-muted">Balance to pay: {fmt(balance, moneyFormat)}. The amount cannot be more than the balance.</p>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
        <div className="md:col-span-4">
          <TextField
            label="Amount *"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              clear("amount");
            }}
            error={errors.amount}
          />
        </div>
        <div className="md:col-span-3">
          <SelectField
            label="Method *"
            options={PAYMENT_METHOD_OPTIONS}
            value={method}
            onChange={(value) => {
              setMethod(value);
              clear("method");
              clear("reference");
            }}
            error={errors.method}
          />
        </div>
        <div className="md:col-span-5">
          <TextField
            label={needsReference ? "Reference *" : "Reference"}
            autoComplete="off"
            maxLength={100}
            value={reference}
            onChange={(event) => {
              setReference(event.target.value);
              clear("reference");
            }}
            error={errors.reference}
            hint={needsReference ? "Needed for card, UPI, bank transfer and cheque." : undefined}
          />
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button onClick={submit} loading={busy}>Record payment</Button>
        {balanceUsable ? (
          <Button variant="secondary" disabled={busy} onClick={() => setAmount(balance)}>Pay full balance</Button>
        ) : null}
      </div>
    </div>
  );
}