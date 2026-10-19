"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonClasses } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useNavigationProgress } from "@/components/ui/navigation-progress";
import { useCan } from "@/components/permissions-provider";
import { ReasonDialog } from "@/components/ui/reason-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast-provider";
import { startConsultationAction } from "@/features/clinical/actions";
import { labelFor } from "@/features/patients/options";
import type { ClientError } from "@/lib/api/errors";
import { formatLocalTime } from "@/lib/datetime";
import { cancelAppointmentAction, checkInAppointmentAction, markNoShowAction } from "./actions";
import { APPOINTMENT_STATUS_OPTIONS, APPOINTMENT_TYPE_OPTIONS, statusTone } from "./options";
import type { AppointmentItem } from "./parse";
import { RescheduleDialog } from "./reschedule-dialog";
import { TokenDialog } from "./token-dialog";

type Props = { items: AppointmentItem[]; today: string; nowTime: string; timezone: string | null };

// Buttons are shown for comfort only. The server decides, and every refusal is shown.
const canCheckIn = (a: AppointmentItem, today: string) => a.status === "booked" && a.date === today;
const canNoShow = (a: AppointmentItem, today: string, nowTime: string) =>
  a.status === "booked" && (a.date < today || (a.date === today && a.time !== "" && a.time <= nowTime));
const canReschedule = (a: AppointmentItem) => a.status === "booked" && a.practitionerId !== "";
const canCancel = (a: AppointmentItem) => a.status === "booked" || a.status === "checked_in";

export function AppointmentTable({ items, today, nowTime, timezone }: Props) {
  const router = useRouter();
  const toast = useToast();
  const can = useCan();
  const progress = useNavigationProgress();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AppointmentItem | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<AppointmentItem | null>(null);
  const [noShowTarget, setNoShowTarget] = useState<AppointmentItem | null>(null);
  const [tokenInfo, setTokenInfo] = useState<{ token: string | null; name: string } | null>(null);

  const mayConsult = (can("appointment.consult") || can("appointment.consult.any")) && can("clinical.encounter.write");

  /** Returns true when the error was handled by leaving the page. */
  function handleError(error: ClientError): boolean {
    if (error.code === "unauthenticated") {
      window.location.assign("/api/auth/session-expired");
      return true;
    }
    toast.fromError(error, { useFieldMessage: true });
    return false;
  }

  async function checkIn(item: AppointmentItem) {
    setBusyId(item.id);
    const response = await checkInAppointmentAction(item.id);
    setBusyId(null);
    if (!response.ok) {
      handleError(response.error);
      return;
    }
    toast.success("Patient checked in.");
    setTokenInfo({ token: response.data.token, name: item.patientName });
    router.refresh();
  }

  async function startConsultation(item: AppointmentItem) {
    setBusyId(item.id);
    const response = await startConsultationAction(item.id);
    setBusyId(null);
    if (!response.ok) {
      handleError(response.error);
      return;
    }
    toast.success("Consultation started.");
    if (response.data.warning) toast.error(`The appointment could not be marked as started: ${response.data.warning}`);
    progress.start();
    router.push(`/consultation/${response.data.encounterId}`);
  }

  async function confirmNoShow() {
    if (!noShowTarget) return;
    setBusyId(noShowTarget.id);
    const response = await markNoShowAction(noShowTarget.id);
    setBusyId(null);
    setNoShowTarget(null);
    if (!response.ok) {
      handleError(response.error);
      return;
    }
    toast.success("Marked as no-show.");
    router.refresh();
  }

  async function submitCancel(reason: string): Promise<ClientError | null> {
    if (!cancelTarget) return null;
    const response = await cancelAppointmentAction(cancelTarget.id, { reason });
    if (response.ok) {
      toast.success("Appointment cancelled.");
      setCancelTarget(null);
      router.refresh();
      return null;
    }
    if (handleError(response.error)) return null;
    return response.error;
  }

  return (
    <>
      <div className="overflow-x-auto border border-ink bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink font-headline text-xs uppercase tracking-wider">
            <tr>
              <th scope="col" className="p-3">Time</th>
              <th scope="col" className="p-3">Patient</th>
              <th scope="col" className="p-3">Doctor</th>
              <th scope="col" className="p-3">Type</th>
              <th scope="col" className="p-3">Status</th>
              <th scope="col" className="p-3">Token</th>
              <th scope="col" className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const actions = [
                can("appointment.checkin") && canCheckIn(item, today) ? (
                  <Button key="in" size="sm" loading={busyId === item.id} onClick={() => checkIn(item)}>Check in</Button>
                ) : null,
                mayConsult && item.status === "checked_in" ? (
                  <Button key="go" size="sm" loading={busyId === item.id} onClick={() => startConsultation(item)}>Start consultation</Button>
                ) : null,
                can("clinical.encounter.view") && item.status === "in_consultation" ? (
                  <Link key="open" href="/consultation" prefetch={false} className={buttonClasses("secondary", undefined, "sm")}>
                    Open consultations
                  </Link>
                ) : null,
                can("appointment.checkin") && canNoShow(item, today, nowTime) ? (
                  <Button key="ns" size="sm" variant="secondary" disabled={busyId === item.id} onClick={() => setNoShowTarget(item)}>No-show</Button>
                ) : null,
                can("appointment.cancel") && canReschedule(item) ? (
                  <Button key="rs" size="sm" variant="secondary" disabled={busyId === item.id} onClick={() => setRescheduleTarget(item)}>Reschedule</Button>
                ) : null,
                can("appointment.cancel") && canCancel(item) ? (
                  <Button key="cx" size="sm" variant="secondary" disabled={busyId === item.id} onClick={() => setCancelTarget(item)}>Cancel</Button>
                ) : null,
              ].filter(Boolean);

              return (
                <tr key={item.id} className="border-b border-accent align-top last:border-b-0 hover:bg-accent">
                  <td className="p-3 font-medium">{item.time ? formatLocalTime(item.time) : "—"}</td>
                  <td className="p-3">
                    <p className="font-medium">{item.patientName || "—"}</p>
                    <p className="text-xs text-muted">MRN {item.patientMrn || "—"}{item.source === "walk_in" ? " · Walk-in" : ""}</p>
                  </td>
                  <td className="p-3">{item.practitionerName || "—"}</td>
                  <td className="p-3">{item.type ? labelFor(APPOINTMENT_TYPE_OPTIONS, item.type) : "—"}</td>
                  <td className="p-3">
                    <StatusBadge label={labelFor(APPOINTMENT_STATUS_OPTIONS, item.status)} tone={statusTone(item.status)} />
                  </td>
                  <td className="p-3 font-headline text-lg font-bold">{item.token ?? "—"}</td>
                  <td className="p-3">
                    {actions.length > 0 ? <div className="flex flex-wrap gap-2">{actions}</div> : <span className="text-muted">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ReasonDialog
        open={cancelTarget !== null}
        title="Cancel this appointment?"
        description="The slot becomes free at once. The reason is stored with the appointment."
        confirmLabel="Cancel appointment"
        onSubmit={submitCancel}
        onClose={() => setCancelTarget(null)}
      />
      <ConfirmDialog
        open={noShowTarget !== null}
        title="Mark as no-show?"
        description="Use this when the patient did not come. It cannot be undone from this screen."
        confirmLabel="Mark no-show"
        busy={busyId !== null && busyId === noShowTarget?.id}
        onConfirm={confirmNoShow}
        onCancel={() => setNoShowTarget(null)}
      />
      <RescheduleDialog
        item={rescheduleTarget}
        today={today}
        timezone={timezone}
        onClose={() => setRescheduleTarget(null)}
        onDone={() => {
          setRescheduleTarget(null);
          router.refresh();
        }}
      />
      <TokenDialog info={tokenInfo} onClose={() => setTokenInfo(null)} />
    </>
  );
}