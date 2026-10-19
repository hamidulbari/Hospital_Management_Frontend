import { isPossiblePhoneNumber } from "libphonenumber-js/min";

type DraftContact = { name?: string; relationship?: string; phone?: string } | undefined;

export type ContactDraft = {
  first_name?: string;
  sex_at_birth?: string;
  phone?: string;
  contacts?: DraftContact[];
};

/** Decides if one more contact row may be added, and says why not when it may not. */
export function canAddContact(draft: ContactDraft, max: number): { allowed: boolean; reason: string | null } {
  const patientReady =
    Boolean(draft.first_name?.trim()) && Boolean(draft.sex_at_birth) && isPossiblePhoneNumber(draft.phone ?? "");
  if (!patientReady) {
    return { allowed: false, reason: "Fill in the patient's first name, sex at birth and phone number first." };
  }

  const contacts = draft.contacts ?? [];
  const complete = contacts.every(
    (c) => Boolean(c?.name?.trim()) && Boolean(c?.relationship?.trim()) && isPossiblePhoneNumber(c?.phone ?? ""),
  );
  if (!complete) {
    return { allowed: false, reason: "Complete the current contact before adding another." };
  }

  if (contacts.length >= max) {
    return { allowed: false, reason: `You can add up to ${max} contacts.` };
  }
  return { allowed: true, reason: null };
}