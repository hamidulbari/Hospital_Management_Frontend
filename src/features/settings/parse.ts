import { list, num, rec, str } from "@/lib/utils/guards";

const TYPES = ["string", "int", "bool", "enum", "email", "host"] as const;
export type SettingType = (typeof TYPES)[number];

export type SettingDef = {
  key: string;
  group: string;
  type: SettingType;
  label: string;
  description: string;
  defaultValue: string | number | boolean | null;
  min: number | null;
  max: number | null;
  maxLength: number | null;
  options: string[];
  /** Write-only: a read only says whether a value is saved. */
  secret: boolean;
  /** Mail, SMS and WhatsApp keys: they need organization.integration.manage. */
  integration: boolean;
  /** false = saved, but nothing in the system uses it yet. */
  enforced: boolean;
};

export type SettingsView = { defs: SettingDef[]; values: Record<string, unknown> };

function defaultOf(value: unknown): string | number | boolean | null {
  if (typeof value === "string" || typeof value === "boolean") return value;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** GET and PATCH /organization/hospitals/{id}/settings answer { data: { values, schema: [...] } }. The form is built from "schema", never from fixed keys. */
export function parseSettingsView(body: unknown): SettingsView {
  const d = rec(rec(body).data);
  const defs = list(d.schema)
    .map((raw): SettingDef => {
      const s = rec(raw);
      const type = (TYPES as readonly string[]).includes(str(s.type)) ? (str(s.type) as SettingType) : "string";
      return {
        key: str(s.key),
        group: str(s.group),
        type,
        label: str(s.label) || str(s.key),
        description: str(s.description),
        defaultValue: defaultOf(s.default),
        min: num(s.min),
        max: num(s.max),
        maxLength: num(s.max_length),
        options: list(s.enum).map(str).filter(Boolean),
        secret: s.secret === true,
        integration: s.integration === true,
        enforced: s.enforced === true,
      };
    })
    .filter((def) => def.key !== "");
  return { defs, values: rec(d.values) };
}

/** A secret reads as { is_set: true | false }. */
export function secretIsSet(value: unknown): boolean {
  return rec(value).is_set === true;
}

const GROUP_LABELS: Record<string, string> = {
  print: "Bills and printing",
  appointment: "Appointments",
  notify: "Reminders",
  mail: "Email (SMTP)",
  sms: "SMS",
  whatsapp: "WhatsApp",
};

export function groupLabel(group: string): string {
  if (GROUP_LABELS[group]) return GROUP_LABELS[group];
  const text = group.replace(/[-_]+/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Other";
}

/** The definitions grouped by "group", in the order the server listed them. */
export function groupDefs(defs: readonly SettingDef[]): { group: string; defs: SettingDef[] }[] {
  const groups = new Map<string, SettingDef[]>();
  for (const def of defs) groups.set(def.group, [...(groups.get(def.group) ?? []), def]);
  return [...groups.entries()].map(([group, items]) => ({ group, defs: items }));
}
