import type { SettingDef, SettingsView } from "./parse";

/** What is typed in the form. A tick box is true or false, everything else is text. */
export type Draft = Record<string, string | boolean>;

export type Built = { changes: Record<string, unknown>; errors: Record<string, string> };

const EMAIL_RE = /^\S+@\S+\.\S+$/;

/** The form starts from the current values. A secret starts empty: its value can never be read back. */
export function initialDraft(view: SettingsView): Draft {
  const draft: Draft = {};
  for (const def of view.defs) {
    const value = view.values[def.key];
    if (def.secret) draft[def.key] = "";
    else if (def.type === "bool") draft[def.key] = value === undefined || value === null ? def.defaultValue === true : value === true;
    else draft[def.key] = value === undefined || value === null ? "" : String(value);
  }
  return draft;
}

/** The value a "Reset to default" shows in the form. */
export function defaultDraftValue(def: SettingDef): string | boolean {
  if (def.type === "bool") return def.defaultValue === true;
  return def.defaultValue === null ? "" : String(def.defaultValue);
}

function intMessage(def: SettingDef): string {
  return def.min !== null && def.max !== null ? `Enter a whole number from ${def.min} to ${def.max}.` : "Enter a whole number.";
}

/**
 * Checks what the person changed and builds the request: { key: value }. null resets a key to its default (or removes a secret).
 * Only keys that were touched go on, and only the ones this user may change. The server is still the judge.
 */
export function buildChanges(
  view: SettingsView,
  draft: Draft,
  touched: ReadonlySet<string>,
  resets: ReadonlySet<string>,
  canEdit: (def: SettingDef) => boolean,
): Built {
  const changes: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const def of view.defs) {
    if (!touched.has(def.key) && !resets.has(def.key)) continue;
    if (!canEdit(def)) continue;

    if (resets.has(def.key)) {
      changes[def.key] = null;
      continue;
    }

    const raw = draft[def.key];

    if (def.type === "bool") {
      changes[def.key] = raw === true;
      continue;
    }

    const text = typeof raw === "string" ? raw.trim() : "";

    if (def.secret) {
      if (text === "") continue; // nothing typed: the saved value stays
      if (def.maxLength !== null && text.length > def.maxLength) errors[def.key] = `At most ${def.maxLength} characters.`;
      else changes[def.key] = text;
      continue;
    }

    if (text === "") {
      changes[def.key] = null; // an emptied box goes back to the default
      continue;
    }

    if (def.type === "int") {
      const n = /^\d+$/.test(text) ? Number(text) : Number.NaN;
      if (!Number.isFinite(n) || (def.min !== null && n < def.min) || (def.max !== null && n > def.max)) errors[def.key] = intMessage(def);
      else changes[def.key] = n;
      continue;
    }

    if (def.type === "enum") {
      if (!def.options.includes(text)) errors[def.key] = "Choose one of the listed values.";
      else changes[def.key] = text;
      continue;
    }

    if (def.maxLength !== null && text.length > def.maxLength) {
      errors[def.key] = `At most ${def.maxLength} characters.`;
      continue;
    }
    if (def.type === "email" && !EMAIL_RE.test(text)) {
      errors[def.key] = "Enter a valid email address.";
      continue;
    }
    changes[def.key] = text;
  }

  return { changes, errors };
}
