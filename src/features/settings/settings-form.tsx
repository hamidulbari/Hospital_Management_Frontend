"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { Notice } from "@/components/ui/notice";
import { PasswordField } from "@/components/ui/password-field";
import { ReadOnlyField } from "@/components/ui/read-only-field";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextField } from "@/components/ui/text-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { useToast } from "@/components/ui/toast-provider";
import { humanize } from "@/lib/format";
import { redirectIfExpired } from "@/lib/session-expired";
import { saveSettingsAction } from "./actions";
import { buildChanges, defaultDraftValue, initialDraft, type Draft } from "./form";
import { groupDefs, groupLabel, secretIsSet, type SettingDef, type SettingsView } from "./parse";

const ENUM_LABELS: Record<string, string> = { none: "None", tls: "TLS", ssl: "SSL" };

function hintFor(def: SettingDef): string {
  const parts: string[] = [];
  if (def.description) parts.push(def.description);
  if (def.type === "int" && def.min !== null && def.max !== null) parts.push(`Whole number from ${def.min} to ${def.max}.`);
  if (def.maxLength !== null && def.type !== "int") parts.push(`Up to ${def.maxLength} characters.`);
  if (def.defaultValue !== null && !def.secret) parts.push(`Default: ${String(def.defaultValue)}.`);
  return parts.join(" ");
}

type Props = {
  initial: SettingsView;
  canGeneral: boolean;
  canIntegration: boolean;
  /** Show only these groups (a page of its own, like Email). Without it every group is shown. */
  groups?: readonly string[];
  /** The page already explains that the settings are only saved, so the form does not say it again. */
  quiet?: boolean;
  /** Hide the title of the group (the page's own title says it). */
  hideGroupTitle?: boolean;
};

export function SettingsForm({ initial, canGeneral, canIntegration, groups, quiet = false, hideGroupTitle = false }: Props) {
  const toast = useToast();
  const [view, setView] = useState(initial);
  const [draft, setDraft] = useState<Draft>(() => initialDraft(initial));
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const [resets, setResets] = useState<ReadonlySet<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const visible = groups ? view.defs.filter((def) => groups.includes(def.group)) : view.defs;
  const canEdit = (def: SettingDef) => (def.integration ? canIntegration : canGeneral);
  const anyEditable = visible.some(canEdit);

  const add = (set: ReadonlySet<string>, key: string): ReadonlySet<string> => new Set([...set, key]);
  const without = (set: ReadonlySet<string>, key: string): ReadonlySet<string> => new Set([...set].filter((k) => k !== key));

  function clearError(key: string) {
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function change(key: string, value: string | boolean) {
    setDraft((current) => ({ ...current, [key]: value }));
    setTouched((current) => add(current, key));
    setResets((current) => without(current, key));
    clearError(key);
  }

  function reset(def: SettingDef) {
    setDraft((current) => ({ ...current, [def.key]: defaultDraftValue(def) }));
    setTouched((current) => add(current, def.key));
    setResets((current) => add(current, def.key));
    clearError(def.key);
  }

  function removeSecret(def: SettingDef) {
    setDraft((current) => ({ ...current, [def.key]: "" }));
    setTouched((current) => add(current, def.key));
    setResets((current) => add(current, def.key));
  }

  async function save() {
    const { changes, errors: problems } = buildChanges(view, draft, touched, resets, canEdit);
    if (Object.keys(problems).length > 0) {
      setErrors(problems);
      toast.error("Please correct the highlighted fields.");
      return;
    }
    if (Object.keys(changes).length === 0) {
      toast.success("There is nothing new to save.");
      return;
    }

    setBusy(true);
    const response = await saveSettingsAction({ settings: changes });
    setBusy(false);

    if (response.ok) {
      setView(response.data);
      setDraft(initialDraft(response.data));
      setTouched(new Set());
      setResets(new Set());
      setErrors({});
      toast.success("Settings saved.");
      return;
    }
    if (redirectIfExpired(response.error)) return;
    const mapped: Record<string, string> = {};
    for (const [path, message] of Object.entries(response.error.fieldErrors)) mapped[path.replace(/^settings\./, "")] = message;
    setErrors(mapped);
    toast.fromError(response.error, { useFieldMessage: true });
  }

  function control(def: SettingDef, editable: boolean) {
    const hint = hintFor(def);
    const error = errors[def.key];
    const value = draft[def.key];
    const isSet = secretIsSet(view.values[def.key]);

    if (!editable) {
      let shown = "";
      if (def.secret) shown = isSet ? "A value is saved" : "Not set";
      else if (def.type === "bool") shown = view.values[def.key] === true ? "Yes" : "No";
      else if (def.type === "enum") shown = ENUM_LABELS[String(view.values[def.key] ?? "")] ?? humanize(String(view.values[def.key] ?? ""));
      else shown = String(view.values[def.key] ?? "");
      return <ReadOnlyField label={def.label} value={shown} hint={hint || undefined} />;
    }

    if (def.type === "bool") {
      return (
        <div className="flex flex-col gap-1">
          <CheckboxField label={def.label} checked={value === true} onChange={(event) => change(def.key, event.target.checked)} />
          {hint ? <p className="text-xs text-muted">{hint}</p> : null}
          {error ? <p className="text-xs font-medium text-error">{error}</p> : null}
        </div>
      );
    }
    if (def.type === "enum") {
      return (
        <SelectField
          label={def.label}
          options={def.options.map((option) => ({ value: option, label: ENUM_LABELS[option] ?? humanize(option) }))}
          value={String(value ?? "")}
          onChange={(next) => change(def.key, next)}
          error={error}
          hint={hint || undefined}
        />
      );
    }
    if (def.secret) {
      return (
        <PasswordField
          label={def.label}
          autoComplete="new-password"
          value={String(value ?? "")}
          onChange={(event) => change(def.key, event.target.value)}
          error={error}
          hint={isSet ? "A value is saved. Type a new one to replace it." : hint || undefined}
        />
      );
    }
    if (def.type === "string" && def.maxLength !== null && def.maxLength > 200) {
      return (
        <TextareaField
          label={def.label}
          value={String(value ?? "")}
          onChange={(next) => change(def.key, next)}
          maxLength={def.maxLength}
          rows={4}
          error={error}
          hint={hint || undefined}
        />
      );
    }
    return (
      <TextField
        label={def.label}
        type={def.type === "email" ? "email" : "text"}
        inputMode={def.type === "int" ? "numeric" : undefined}
        autoComplete="off"
        maxLength={def.type === "int" ? undefined : (def.maxLength ?? undefined)}
        value={String(value ?? "")}
        onChange={(event) => change(def.key, event.target.value)}
        error={error}
        hint={hint || undefined}
      />
    );
  }

  const shownGroups = groupDefs(visible);

  return (
    <div className="flex flex-col gap-8">
      {shownGroups.length === 0 ? <p className="text-sm text-muted">No settings are available for you here.</p> : null}

      {shownGroups.map(({ group, defs }) => {
        const savedOnly = defs.every((def) => def.integration && !def.enforced);
        return (
          <section key={group} className="border border-ink bg-surface p-6">
            {hideGroupTitle ? null : <h3 className="mb-4 font-headline text-sm font-bold uppercase tracking-wider text-ink">{groupLabel(group)}</h3>}
            {savedOnly && !quiet ? (
              <div className="mb-5">
                <Notice>These settings are only saved for now. Nothing sends email, SMS or WhatsApp messages yet, so there is no test button.</Notice>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
              {defs.map((def) => {
                const editable = canEdit(def);
                const isSet = secretIsSet(view.values[def.key]);
                return (
                  <div key={def.key} className={def.type === "string" && def.maxLength !== null && def.maxLength > 200 ? "flex flex-col gap-2 md:col-span-2" : "flex flex-col gap-2"}>
                    {control(def, editable)}
                    <div className="flex flex-wrap items-center gap-2">
                      {!def.enforced ? <StatusBadge label="Saved, not active yet" tone="neutral" /> : null}
                      {def.secret ? <StatusBadge label={isSet ? "A value is saved" : "Not set"} tone={isSet ? "active" : "muted"} /> : null}
                      {editable && !def.secret ? (
                        <Button size="sm" variant="secondary" onClick={() => reset(def)}>
                          Reset to default
                        </Button>
                      ) : null}
                      {editable && def.secret && isSet && !resets.has(def.key) ? (
                        <Button size="sm" variant="secondary" onClick={() => removeSecret(def)}>
                          Remove saved value
                        </Button>
                      ) : null}
                      {def.secret && resets.has(def.key) ? <span className="text-xs font-medium text-ink">It will be removed when you save.</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {anyEditable ? (
        <div>
          <Button onClick={save} loading={busy}>Save settings</Button>
        </div>
      ) : (
        <p className="text-xs text-muted">You may read these settings but not change them.</p>
      )}
    </div>
  );
}
