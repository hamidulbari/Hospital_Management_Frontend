"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast-provider";
import { formatLocalDate, formatLocalTime } from "@/lib/datetime";
import { rescheduleAppointmentAction } from "./actions";
import type { AppointmentItem } from "./parse";
import { SlotPicker, type PickedSlot } from "./slot-picker";

type Props = { item: AppointmentItem | null; today: string; timezone: string | null; onClose: () => void; onDone: () => void };

function RescheduleBody({ item, today, timezone, onClose, onDone }: Omit<Props, "item"> & { item: AppointmentItem }) {
  const toast = useToast();
  const [slot, setSlot] = useState<PickedSlot | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  async function confirm() {
    if (!slot) return;
    setBusy(true);
    const response = await rescheduleAppointmentAction(item.id, slot);
    setBusy(false);

    if (response.ok) {
      toast.success("Appointment rescheduled.");
      onDone();
      return;
    }
    if (response.error.code === "unauthenticated") {
      window.location.assign("/api/auth/session-expired");
      return;
    }
    if (response.error.code === "slot_unavailable") {
      setSlot(null);
      setReloadKey((key) => key + 1);
    }
    toast.fromError(response.error, { useFieldMessage: true });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Now: {formatLocalDate(item.date)}, {formatLocalTime(item.time)} with {item.practitionerName || "the same doctor"}. Choose a new slot of the same doctor.
      </p>
      <SlotPicker practitionerId={item.practitionerId} timezone={timezone} today={today} value={slot} onChange={setSlot} reloadKey={reloadKey} />
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={busy}>Close</Button>
        <Button onClick={confirm} loading={busy} disabled={!slot}>Reschedule</Button>
      </div>
    </div>
  );
}

export function RescheduleDialog({ item, ...rest }: Props) {
  return (
    <Modal open={item !== null} title="Reschedule appointment" size="lg" onClose={rest.onClose}>
      {item ? <RescheduleBody item={item} {...rest} /> : null}
    </Modal>
  );
}