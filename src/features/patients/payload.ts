import type { FieldErrors } from "@/lib/api/errors";
import type { RegisterFormValues } from "./schemas";

/** Drops empty optional fields and turns the age into a number. Sends only what the API documents. */
export function buildRegisterBody(values: RegisterFormValues, acknowledgeDuplicates: boolean): Record<string, unknown> {
  const body: Record<string, unknown> = {
    first_name: values.first_name.trim(),
    sex_at_birth: values.sex_at_birth,
    phone: values.phone.trim(),
  };

  const optional: Record<string, string> = {
    title: values.title,
    middle_name: values.middle_name,
    last_name: values.last_name,
    date_of_birth: values.date_of_birth,
    email: values.email,
    blood_group: values.blood_group,
    preferred_language: values.preferred_language,
  };
  for (const [key, value] of Object.entries(optional)) {
    const trimmed = value.trim();
    if (trimmed) body[key] = trimmed;
  }

  // An estimated age is only for patients whose date of birth is not known.
  if (!values.date_of_birth.trim() && values.estimated_age_years.trim()) {
    body.estimated_age_years = Number(values.estimated_age_years);
  }

  if (values.contacts.length > 0) {
    body.contacts = values.contacts.map((c) => ({
      name: c.name.trim(),
      relationship: c.relationship.trim(),
      phone: c.phone.trim(),
      is_emergency: c.is_emergency,
      is_authorized_representative: c.is_authorized_representative,
    }));
  }

  // Only ticked consents are sent.
  const given = values.consents.filter((c) => c.granted);
  if (given.length > 0) {
    body.consents = given.map((c) => ({ type: c.type, method: c.method, given_by: c.given_by }));
  }

  if (acknowledgeDuplicates) body.acknowledge_duplicates = true;
  return body;
}

/**
 * The server numbers consents by their place in what we SENT (ticked ones only).
 * The form shows all of them, so map "consents.1.method" back to the row on screen.
 */
export function remapConsentFieldErrors(fieldErrors: FieldErrors, values: RegisterFormValues): FieldErrors {
  const rowOf = values.consents.map((c, index) => (c.granted ? index : -1)).filter((index) => index >= 0);
  const out: FieldErrors = {};
  for (const [path, message] of Object.entries(fieldErrors)) {
    const match = /^consents\.(\d+)(\..*)?$/.exec(path);
    if (!match) {
      out[path] = message;
      continue;
    }
    const row = rowOf[Number(match[1])];
    out[row === undefined ? path : `consents.${row}${match[2] ?? ""}`] = message;
  }
  return out;
}