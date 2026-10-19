"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SelectField, type Option } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast-provider";
import type { ClientError } from "@/lib/api/errors";
import { buildLines, emptyLine, type ApiLine, type LineDraft, type LineErrors, type LineField } from "./lines";

const MAX_LINES = 50; // a limit of this screen, not of the server

const SERVER_FIELDS: Record<string, LineField> = {
  service_id: "service",
  description: "description",
  quantity: "quantity",
  unit_price: "unitPrice",
  discount_amount: "discount",
  tax_percent: "taxPercent",
};

type Props = {
  services: Option[];
  canDiscount: boolean;
  canCustom: boolean;
  initial: LineDraft[];
  submitLabel: string;
  /** Return null on success (the caller moves on) or the error. */
  onSubmit: (lines: ApiLine[]) => Promise<ClientError | null>;
  onCancel?: () => void;
};

export function LinesEditor({ services, canDiscount, canCustom, initial, submitLabel, onSubmit, onCancel }: Props) {
  const toast = useToast();
  const [drafts, setDrafts] = useState<LineDraft[]>(() => (initial.length > 0 ? initial : [emptyLine("service")]));
  const [errors, setErrors] = useState<LineErrors>({});
  const [busy, setBusy] = useState(false);

  function change(index: number, patch: Partial<LineDraft>, fields: LineField[]) {
    setDrafts((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
    setErrors((current) => {
      const lineErrors = current[index];
      if (!lineErrors) return current;
      const next = { ...lineErrors };
      for (const field of fields) delete next[field];
      return { ...current, [index]: next };
    });
  }

  function remove(index: number) {
    setDrafts((current) => current.filter((_, i) => i !== index));
    setErrors({});
  }

  async function submit() {
    const built = buildLines(drafts, { canDiscount });
    if (!built.ok) {
      setErrors(built.errors);
      toast.error(built.message);
      return;
    }
    setBusy(true);
    const failure = await onSubmit(built.lines);
    setBusy(false);
    if (!failure) return;

    // Server paths look like "lines.0.unit_price": show the message next to that field.
    const mapped: LineErrors = {};
    for (const [path, message] of Object.entries(failure.fieldErrors)) {
      const match = /^lines\.(\d+)\.(\w+)$/.exec(path);
      const field = match ? SERVER_FIELDS[match[2]] : undefined;
      if (match && field) mapped[Number(match[1])] = { ...mapped[Number(match[1])], [field]: message };
    }
    setErrors(mapped);
  }

  return (
    <div className="flex flex-col gap-4">
      {drafts.map((draft, index) => {
        const e = errors[index] ?? {};
        return (
          <div key={draft.key} className="border border-ink bg-surface p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="font-headline text-xs font-semibold uppercase tracking-wider text-ink">
                {draft.kind === "service" ? "Service" : "Other item"} {index + 1}
              </p>
              <Button size="sm" variant="secondary" disabled={drafts.length === 1 || busy} onClick={() => remove(index)}>Remove</Button>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
              {draft.kind === "service" ? (
                <>
                  <div className="md:col-span-6">
                    <SelectField
                      label="Service *"
                      options={services}
                      value={draft.serviceId}
                      onChange={(value) => change(index, { serviceId: value }, ["service"])}
                      error={e.service}
                      hint="The price comes from the price list."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <TextField label="Quantity *" inputMode="numeric" autoComplete="off" value={draft.quantity} onChange={(ev) => change(index, { quantity: ev.target.value }, ["quantity"])} error={e.quantity} />
                  </div>
                  {canDiscount ? (
                    <div className="md:col-span-4">
                      <TextField label="Discount (amount)" inputMode="decimal" autoComplete="off" value={draft.discount} onChange={(ev) => change(index, { discount: ev.target.value }, ["discount"])} error={e.discount} />
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="md:col-span-6">
                    <TextField label="Description *" autoComplete="off" maxLength={200} value={draft.description} onChange={(ev) => change(index, { description: ev.target.value }, ["description"])} error={e.description} />
                  </div>
                  <div className="md:col-span-3">
                    <TextField label="Unit price *" inputMode="decimal" autoComplete="off" value={draft.unitPrice} onChange={(ev) => change(index, { unitPrice: ev.target.value }, ["unitPrice"])} error={e.unitPrice} />
                  </div>
                  <div className="md:col-span-3">
                    <TextField label="Tax %" inputMode="decimal" autoComplete="off" value={draft.taxPercent} onChange={(ev) => change(index, { taxPercent: ev.target.value }, ["taxPercent"])} error={e.taxPercent} />
                  </div>
                  <div className="md:col-span-3">
                    <TextField label="Quantity *" inputMode="numeric" autoComplete="off" value={draft.quantity} onChange={(ev) => change(index, { quantity: ev.target.value }, ["quantity"])} error={e.quantity} />
                  </div>
                  {canDiscount ? (
                    <div className="md:col-span-3">
                      <TextField label="Discount (amount)" inputMode="decimal" autoComplete="off" value={draft.discount} onChange={(ev) => change(index, { discount: ev.target.value }, ["discount"])} error={e.discount} />
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" disabled={drafts.length >= MAX_LINES || busy} onClick={() => setDrafts((c) => [...c, emptyLine("service")])}>
          Add service
        </Button>
        {canCustom ? (
          <Button variant="secondary" disabled={drafts.length >= MAX_LINES || busy} onClick={() => setDrafts((c) => [...c, emptyLine("custom")])}>
            Add other item
          </Button>
        ) : null}
      </div>

      <p className="text-xs text-muted">Totals, tax and the invoice number are worked out by the server when you save.</p>

      <div className="flex flex-wrap gap-3">
        <Button onClick={submit} loading={busy}>{submitLabel}</Button>
        {onCancel ? <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button> : null}
      </div>
    </div>
  );
}