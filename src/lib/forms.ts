import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { ClientError } from "@/lib/api/errors";

/** Put server field errors next to the listed fields. Returns true if at least one was placed. */
export function applyFieldErrors<T extends FieldValues>(
  error: ClientError,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): boolean {
  let applied = false;
  for (const field of fields) {
    const message = error.fieldErrors[field];
    if (message) {
      setError(field, { type: "server", message });
      applied = true;
    }
  }
  return applied;
}

/** Same, for every path the server named (for example "contacts.0.phone"). */
export function applyAllFieldErrors<T extends FieldValues>(error: ClientError, setError: UseFormSetError<T>): boolean {
  let applied = false;
  for (const [path, message] of Object.entries(error.fieldErrors)) {
    setError(path as Path<T>, { type: "server", message });
    applied = true;
  }
  return applied;
}