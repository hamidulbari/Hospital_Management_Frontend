"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DateField } from "@/components/ui/date-field";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast-provider";
import { labelFor } from "@/features/patients/options";
import { fieldErrorsFromZod } from "@/lib/api/invalid";
import { formatLocalDate } from "@/lib/datetime";
import { humanize } from "@/lib/format";
import { redirectIfExpired } from "@/lib/session-expired";
import { addCredentialAction, verifyCredentialAction } from "./actions";
import { CREDENTIAL_TYPE_OPTIONS, practitionerTone } from "./options";
import type { CredentialItem } from "./parse";
import { credentialSchema } from "./schemas";

type Props = { practitionerId: string; credentials: CredentialItem[]; canManage: boolean; canVerify: boolean };

export function CredentialsPanel({ practitionerId, credentials, canManage, canVerify }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [type, setType] = useState("");
  const [number, setNumber] = useState("");
  const [body, setBody] = useState("");
  const [issued, setIssued] = useState("");
  const [expires, setExpires] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<{ credential: CredentialItem; outcome: "verified" | "rejected" } | null>(null);
  const [reviewing, setReviewing] = useState(false);

  async function submit() {
    const check = credentialSchema.safeParse({ credential_type: type, registration_number: number, issuing_body: body, issued_on: issued, expires_on: expires });
    if (!check.success) {
      setErrors(fieldErrorsFromZod(check.error));
      toast.error("Please correct the highlighted fields.");
      return;
    }
    setBusy(true);
    const response = await addCredentialAction(practitionerId, check.data);
    setBusy(false);
    if (response.ok) {
      toast.success("Credential added. It waits for verification.");
      setType("");
      setNumber("");
      setBody("");
      setIssued("");
      setExpires("");
      setErrors({});
      router.refresh();
      return;
    }
    if (redirectIfExpired(response.error)) return;
    setErrors(response.error.fieldErrors);
    toast.fromError(response.error, { useFieldMessage: true });
  }

  async function confirmReview() {
    if (!review) return;
    setReviewing(true);
    const response = await verifyCredentialAction(practitionerId, review.credential.id, { outcome: review.outcome });
    setReviewing(false);
    setReview(null);
    if (response.ok) {
      toast.success(review.outcome === "verified" ? "Credential verified." : "Credential rejected.");
      router.refresh();
      return;
    }
    if (redirectIfExpired(response.error)) return;
    toast.fromError(response.error, { useFieldMessage: true });
  }

  return (
    <div className="flex flex-col gap-6">
      {credentials.length === 0 ? (
        <p className="text-sm text-muted">No credentials recorded.</p>
      ) : (
        <ul className="border border-ink bg-surface">
          {credentials.map((credential, index) => (
            <li key={credential.id || index} className="flex flex-wrap items-center justify-between gap-3 border-b border-accent p-4 last:border-b-0">
              <div>
                <p className="text-sm font-medium text-ink">{labelFor(CREDENTIAL_TYPE_OPTIONS, credential.type)} · {credential.number}</p>
                <p className="text-xs text-muted">
                  {credential.issuingBody}
                  {credential.issuedOn ? ` · issued ${formatLocalDate(credential.issuedOn)}` : ""}
                  {credential.expiresOn ? ` · expires ${formatLocalDate(credential.expiresOn)}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge label={humanize(credential.status || "pending")} tone={practitionerTone(credential.status || "pending")} />
                {canVerify && (credential.status || "pending") === "pending" && credential.id ? (
                  <>
                    <Button size="sm" onClick={() => setReview({ credential, outcome: "verified" })}>Verify</Button>
                    <Button size="sm" variant="secondary" onClick={() => setReview({ credential, outcome: "rejected" })}>Reject</Button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <div className="border border-ink bg-surface p-6">
          <h3 className="mb-4 font-headline text-xs font-semibold uppercase tracking-wider text-ink">Add a credential</h3>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
            <div className="md:col-span-4">
              <SelectField label="Type *" options={CREDENTIAL_TYPE_OPTIONS} value={type} onChange={setType} error={errors.credential_type} />
            </div>
            <div className="md:col-span-4">
              <TextField label="Registration number *" autoComplete="off" value={number} onChange={(e) => setNumber(e.target.value)} error={errors.registration_number} />
            </div>
            <div className="md:col-span-4">
              <TextField label="Issued by *" autoComplete="off" maxLength={150} value={body} onChange={(e) => setBody(e.target.value)} error={errors.issuing_body} />
            </div>
            <div className="md:col-span-3">
              <DateField label="Issued on" value={issued} onChange={setIssued} disableFuture={false} minYear={1960} error={errors.issued_on} />
            </div>
            <div className="md:col-span-3">
              <DateField label="Expires on" value={expires} onChange={setExpires} disableFuture={false} minYear={2000} error={errors.expires_on} />
            </div>
          </div>
          <div className="mt-5">
            <Button onClick={submit} loading={busy}>Add credential</Button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={review !== null}
        title={review?.outcome === "verified" ? "Verify this credential?" : "Reject this credential?"}
        description="A credential is reviewed only once, and nobody can review their own."
        confirmLabel={review?.outcome === "verified" ? "Verify" : "Reject"}
        busy={reviewing}
        onConfirm={confirmReview}
        onCancel={() => setReview(null)}
      />
    </div>
  );
}