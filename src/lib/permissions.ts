export type PermissionCode =
  | "organization.hospital.view" | "organization.hospital.manage"
  | "organization.branch.view" | "organization.branch.manage"
  | "organization.department.view" | "organization.department.manage"
  | "identity.user.view" | "identity.user.manage" | "identity.user.assign_roles" | "identity.role.view"
  | "audit.event.view" | "system.docs.view"
  | "practitioner.view" | "practitioner.manage" | "practitioner.credential.verify"
  | "appointment.view" | "appointment.book" | "appointment.cancel" | "appointment.checkin"
  | "appointment.consult" | "appointment.consult.any"
  | "clinical.encounter.view" | "clinical.encounter.write" | "clinical.vitals.record"
  | "clinical.note.write" | "clinical.note.sign" | "clinical.diagnosis.write"
  | "billing.service.view" | "billing.service.manage"
  | "billing.invoice.view" | "billing.invoice.create" | "billing.invoice.issue" | "billing.invoice.cancel"
  | "billing.discount.apply" | "billing.payment.record" | "billing.payment.reverse" | "billing.statement.view"
  | "patient.view" | "patient.register" | "patient.consent.manage" | "patient.list"
  | "dashboard.view";

/** Comfort only: the server decides, and every 403 must still be handled. */
export function can(permissions: readonly string[], code: PermissionCode): boolean {
  return permissions.includes(code);
}

export function canAny(permissions: readonly string[], codes: readonly PermissionCode[]): boolean {
  return codes.some((code) => permissions.includes(code));
}

export function canAll(permissions: readonly string[], codes: readonly PermissionCode[]): boolean {
  return codes.every((code) => permissions.includes(code));
}
