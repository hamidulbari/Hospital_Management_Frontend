"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-provider";
import { withdrawConsentAction } from "./actions";
import { CONSENT_METHOD_OPTIONS, CONSENT_TYPE_OPTIONS, GIVEN_BY_OPTIONS, labelFor } from "./options";
import type { PatientConsent } from "./parse";
import { RecordConsentForm } from "./record-consent-form";

export function ConsentsPanel({ patientId, consents, canManage }: { patientId: string; consents: PatientConsent[]; canManage: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [target, setTarget] = useState<PatientConsent | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirmWithdraw() {
    if (!target) return;
    setBusy(true);
    const response = await withdrawConsentAction(patientId, target.id);
    setBusy(false);

    if (response.ok) {
      setTarget(null);
      toast.success("Consent withdrawn.");
      router.refresh();
      return;
    }
    if (response.error.code === "unauthenticated") {
      window.location.assign("/api/auth/session-expired");
      return;
    }
    setTarget(null);
    toast.fromError(response.error, { useFieldMessage: true });
  }

  return (
    <div>
      {consents.length === 0 ? (
        <p className="text-sm text-muted">No consents recorded.</p>
      ) : (
        <ul className="border border-ink bg-surface">
          {consents.map((consent) => (
            <li key={consent.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-accent p-4 last:border-b-0">
              <div>
                <p className="text-sm font-medium text-ink">{labelFor(CONSENT_TYPE_OPTIONS, consent.type)}</p>
                <p className="text-xs text-muted">
                  {labelFor(CONSENT_METHOD_OPTIONS, consent.method)} · given by {labelFor(GIVEN_BY_OPTIONS, consent.givenBy).toLowerCase()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={clsx(
                    "border px-2 py-1 font-headline text-xs font-semibold uppercase tracking-wider",
                    consent.withdrawn ? "border-muted text-muted" : "border-accent bg-accent text-ink",
                  )}
                >
                  {consent.withdrawn ? "Withdrawn" : "Active"}
                </span>
                {canManage && !consent.withdrawn ? (
                  <Button variant="secondary" onClick={() => setTarget(consent)}>Withdraw</Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage ? <RecordConsentForm patientId={patientId} /> : null}

      <ConfirmDialog
        open={target !== null}
        title="Withdraw this consent?"
        description="The record is kept. Only its status changes to withdrawn."
        confirmLabel="Withdraw consent"
        busy={busy}
        onConfirm={confirmWithdraw}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}