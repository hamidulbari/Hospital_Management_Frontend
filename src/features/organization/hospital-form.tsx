"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { ReadOnlyField } from "@/components/ui/read-only-field";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast-provider";
import { fieldErrorsFromZod } from "@/lib/api/invalid";
import { redirectIfExpired } from "@/lib/session-expired";
import { updateHospitalAction } from "./actions";
import { DATE_FORMAT_OPTIONS } from "./options";
import type { Hospital } from "./parse";
import { hospitalSchema } from "./schemas";
import { timezoneOptions } from "./timezones";

export function HospitalForm({ hospital }: { hospital: Hospital }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState<Record<string, string>>(() => ({
    name: hospital.name,
    registration_no: hospital.registrationNo,
    gstin: hospital.gstin,
    pan: hospital.pan,
    address_line1: hospital.line1,
    address_line2: hospital.line2,
    city: hospital.city,
    state: hospital.state,
    pincode: hospital.pincode,
    phone: hospital.phone,
    email: hospital.email,
    timezone: hospital.timezone,
    default_locale: hospital.locale || "en",
    date_format: hospital.dateFormat || "DD/MM/YYYY",
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const zones = useMemo(() => timezoneOptions(hospital.timezone), [hospital.timezone]);
  const timezoneChanged = v.timezone !== hospital.timezone;

  function set(key: string, value: string) {
    setV((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  const text = (key: string, label: string, extra?: { type?: string; hint?: string; maxLength?: number }) => (
    <TextField label={label} autoComplete="off" type={extra?.type} hint={extra?.hint} maxLength={extra?.maxLength} value={v[key]} onChange={(e) => set(key, e.target.value)} error={errors[key]} />
  );

  async function submit() {
    const check = hospitalSchema.safeParse(v);
    if (!check.success) {
      setErrors(fieldErrorsFromZod(check.error));
      toast.error("Please correct the highlighted fields.");
      return;
    }
    setBusy(true);
    const response = await updateHospitalAction(hospital.id, check.data);
    setBusy(false);
    if (response.ok) {
      toast.success("Hospital profile saved.");
      router.refresh();
      return;
    }
    if (redirectIfExpired(response.error)) return;
    setErrors(response.error.fieldErrors);
    toast.fromError(response.error, { useFieldMessage: true });
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="border border-ink bg-surface p-6">
        <h2 className="mb-4 font-headline text-sm font-bold uppercase tracking-wider text-ink">Identity</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
          <div className="md:col-span-6">{text("name", "Hospital name *", { maxLength: 200 })}</div>
          <div className="md:col-span-3"><ReadOnlyField label="Code" value={hospital.code} hint="Cannot be changed." /></div>
          <div className="md:col-span-3"><ReadOnlyField label="Currency" value={hospital.currencyCode} hint="Cannot be changed here." /></div>
          <div className="md:col-span-4">{text("registration_no", "Registration no.", { maxLength: 60 })}</div>
          <div className="md:col-span-4">{text("gstin", "GSTIN", { maxLength: 20 })}</div>
          <div className="md:col-span-4">{text("pan", "PAN", { maxLength: 20 })}</div>
        </div>
      </section>

      <section className="border border-ink bg-surface p-6">
        <h2 className="mb-4 font-headline text-sm font-bold uppercase tracking-wider text-ink">Address and contact</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
          <div className="md:col-span-6">{text("address_line1", "Address line 1", { maxLength: 200 })}</div>
          <div className="md:col-span-6">{text("address_line2", "Address line 2", { maxLength: 200 })}</div>
          <div className="md:col-span-4">{text("city", "City", { maxLength: 100 })}</div>
          <div className="md:col-span-4">{text("state", "State", { maxLength: 100 })}</div>
          <div className="md:col-span-4">{text("pincode", "Pincode", { maxLength: 10 })}</div>
          <div className="md:col-span-6">{text("phone", "Phone", { maxLength: 30 })}</div>
          <div className="md:col-span-6">{text("email", "Email", { type: "email", maxLength: 190 })}</div>
        </div>
        <p className="mt-4 text-xs text-muted">The name, address, phone, GSTIN and registration number are printed at the top of bills.</p>
      </section>

      <section className="border border-ink bg-surface p-6">
        <h2 className="mb-4 font-headline text-sm font-bold uppercase tracking-wider text-ink">Time and language</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
          <div className="md:col-span-6">
            <SelectField label="Timezone *" options={zones} value={v.timezone} onChange={(value) => set("timezone", value)} error={errors.timezone} hint="Every appointment time and slot is read in this timezone." />
          </div>
          <div className="md:col-span-3">
            <SelectField label="Date format *" options={DATE_FORMAT_OPTIONS} value={v.date_format} onChange={(value) => set("date_format", value)} error={errors.date_format} />
          </div>
          <div className="md:col-span-3">{text("default_locale", "Locale *", { maxLength: 10, hint: "For example en." })}</div>
        </div>
        {timezoneChanged ? (
          <div className="mt-4">
            <Notice tone="error">Changing the timezone changes how every appointment time and working hour is read. Check the doctors&apos; working hours after saving.</Notice>
          </div>
        ) : null}
      </section>

      <div>
        <Button onClick={submit} loading={busy}>Save hospital profile</Button>
      </div>
    </div>
  );
}