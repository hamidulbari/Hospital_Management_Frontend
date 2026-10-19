"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { SelectField, type Option } from "@/components/ui/select-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { useToast } from "@/components/ui/toast-provider";
import { bookAppointmentAction } from "./actions";
import { APPOINTMENT_TYPE_OPTIONS } from "./options";
import { PatientPicker, type PickedPatient } from "./patient-picker";
import { SlotPicker, type PickedSlot } from "./slot-picker";

type Props = { mode: "booking" | "walk_in"; practitioners: Option[]; today: string; timezone: string | null };

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-ink bg-surface p-6">
      <h2 className="mb-4 font-headline text-sm font-bold uppercase tracking-wider text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function BookingForm({ mode, practitioners, today, timezone }: Props) {
  const router = useRouter();
  const toast = useToast();
  const walkIn = mode === "walk_in";

  const [patient, setPatient] = useState<PickedPatient | null>(null);
  const [practitionerId, setPractitionerId] = useState("");
  const [slot, setSlot] = useState<PickedSlot | null>(null);
  const [type, setType] = useState("consultation");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  function clearError(key: string) {
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function submit() {
    const problems: Record<string, string> = {};
    if (!patient) problems.patient_id = "Choose a patient.";
    if (!practitionerId) problems.practitioner_id = "Choose a doctor.";
    if (!slot) problems.slot = "Choose a time slot.";
    if (reason.length > 150) problems.reason = "At most 150 characters.";
    if (Object.keys(problems).length > 0 || !patient || !slot) {
      setErrors(problems);
      toast.error("Please complete the highlighted fields.");
      return;
    }

    setBusy(true);
    const response = await bookAppointmentAction({
      patient_id: patient.id,
      practitioner_id: practitionerId,
      date: slot.date,
      time: slot.time,
      appointment_type: type,
      source: walkIn ? "walk_in" : "staff",
      reason,
    });
    setBusy(false);

    if (response.ok) {
      toast.success(walkIn ? "Walk-in registered." : "Appointment booked.");
      router.push(`/appointments?date=${slot.date}&practitioner=${practitionerId}`);
      return;
    }
    const error = response.error;
    if (error.code === "unauthenticated") {
      window.location.assign("/api/auth/session-expired");
      return;
    }
    if (error.code === "slot_unavailable") {
      setSlot(null);
      setReloadKey((key) => key + 1); // reload the slots: someone else may have taken this one
      setErrors({ slot: "Choose another slot." });
    } else {
      const mapped: Record<string, string> = {};
      for (const [path, message] of Object.entries(error.fieldErrors)) mapped[path === "date" || path === "time" ? "slot" : path] = message;
      setErrors(mapped);
    }
    toast.fromError(error, { useFieldMessage: true });
  }

  if (practitioners.length === 0) {
    return <Notice tone="error">No active doctors were found, or you may not view them. Ask an administrator.</Notice>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Block title="1. Patient">
        <PatientPicker
          value={patient}
          onChange={(next) => {
            setPatient(next);
            clearError("patient_id");
          }}
          error={errors.patient_id}
        />
      </Block>

      <Block title={walkIn ? "2. Doctor and slot (today)" : "2. Doctor and slot"}>
        <div className="flex flex-col gap-5">
          <div className="max-w-md">
            <SelectField
              label="Doctor *"
              options={practitioners}
              value={practitionerId}
              onChange={(next) => {
                setPractitionerId(next);
                setSlot(null);
                clearError("practitioner_id");
              }}
              error={errors.practitioner_id}
            />
          </div>
          <SlotPicker
            practitionerId={practitionerId}
            timezone={timezone}
            today={today}
            value={slot}
            onChange={(next) => {
              setSlot(next);
              clearError("slot");
            }}
            reloadKey={reloadKey}
            lockToToday={walkIn}
          />
          {errors.slot ? <p className="text-xs font-medium text-error">{errors.slot}</p> : null}
          {walkIn ? (
            <p className="text-xs text-muted">Only today&apos;s free slots are listed. A slot that is already running may not appear here.</p>
          ) : null}
        </div>
      </Block>

      <Block title="3. Details">
        <div className="flex max-w-xl flex-col gap-5">
          <SelectField label="Type" options={APPOINTMENT_TYPE_OPTIONS} value={type} onChange={setType} error={errors.appointment_type} />
          <TextareaField label="Reason for visit" value={reason} onChange={setReason} maxLength={150} error={errors.reason} hint="Optional, up to 150 characters." />
        </div>
      </Block>

      <div>
        <Button onClick={submit} loading={busy}>{walkIn ? "Register walk-in" : "Book appointment"}</Button>
      </div>
    </div>
  );
}