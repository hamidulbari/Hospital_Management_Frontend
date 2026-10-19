"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast-provider";
import { normalizeMoneyInput } from "@/lib/money";
import { redirectIfExpired } from "@/lib/session-expired";
import { createServiceAction, updateServiceAction } from "./actions";
import { ACTIVE_OPTIONS, SERVICE_CATEGORY_OPTIONS } from "./options";
import type { ServiceItem } from "./parse";

export type ServiceTarget = "new" | ServiceItem | null;

function ServiceForm({ service, onClose, onDone }: { service: ServiceItem | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [code, setCode] = useState("");
  const [name, setName] = useState(service?.name ?? "");
  const [category, setCategory] = useState(service?.category ?? "");
  const [price, setPrice] = useState(service?.unitPrice ?? "");
  const [tax, setTax] = useState(service?.taxPercent ?? "");
  const [active, setActive] = useState(service ? String(service.active) : "true");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    const problems: Record<string, string> = {};
    const normalized = normalizeMoneyInput(price);
    if (!service && !code.trim()) problems.code = "Enter a code.";
    if (!name.trim()) problems.name = "Enter a name.";
    if (!category) problems.category = "Choose a category.";
    if (normalized === null) problems.unit_price = "Enter a price like 500.00 (at most two decimals).";
    if (tax.trim() && !/^\d+(\.\d{1,2})?$/.test(tax.trim())) problems.tax_percent = "Enter a percentage like 5 or 12.5.";
    if (Object.keys(problems).length > 0 || normalized === null) {
      setErrors(problems);
      toast.error("Please correct the highlighted fields.");
      return;
    }

    setBusy(true);
    const common = { name, category, unit_price: normalized, tax_percent: tax.trim() };
    const response = service
      ? await updateServiceAction(service.id, { ...common, is_active: active === "true" })
      : await createServiceAction({ ...common, code });
    setBusy(false);

    if (response.ok) {
      toast.success(service ? "Service updated." : "Service added.");
      onDone();
      return;
    }
    if (redirectIfExpired(response.error)) return;
    setErrors(response.error.fieldErrors);
    toast.fromError(response.error, { useFieldMessage: true });
  }

  return (
    <div className="flex flex-col gap-5">
      {service ? (
        <p className="text-xs text-muted">A new price only affects invoices created afterwards. The old and the new price are written to the audit trail.</p>
      ) : (
        <p className="text-xs text-muted">The code is stored in capitals and must be unique in the hospital.</p>
      )}
      {!service ? (
        <TextField label="Code *" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} error={errors.code} />
      ) : (
        <p className="text-sm text-ink">Code: <span className="font-semibold">{service.code}</span></p>
      )}
      <TextField label="Name *" autoComplete="off" maxLength={200} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
      <SelectField label="Category *" options={SERVICE_CATEGORY_OPTIONS} value={category} onChange={setCategory} error={errors.category} />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField label="Unit price *" inputMode="decimal" autoComplete="off" value={price} onChange={(e) => setPrice(e.target.value)} error={errors.unit_price} />
        <TextField label="Tax %" inputMode="decimal" autoComplete="off" value={tax} onChange={(e) => setTax(e.target.value)} error={errors.tax_percent} />
      </div>
      {service ? <SelectField label="Status" options={ACTIVE_OPTIONS} value={active} onChange={setActive} /> : null}
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={busy}>Close</Button>
        <Button onClick={submit} loading={busy}>{service ? "Save changes" : "Add service"}</Button>
      </div>
    </div>
  );
}

export function ServiceDialog({ target, onClose, onDone }: { target: ServiceTarget; onClose: () => void; onDone: () => void }) {
  return (
    <Modal open={target !== null} title={target === "new" ? "Add a service" : "Edit service"} onClose={onClose}>
      {target !== null ? <ServiceForm service={target === "new" ? null : target} onClose={onClose} onDone={onDone} /> : null}
    </Modal>
  );
}