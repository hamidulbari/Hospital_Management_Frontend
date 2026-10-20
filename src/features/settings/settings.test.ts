import { describe, expect, it } from "vitest";
import { buildChanges, defaultDraftValue, initialDraft } from "./form";
import { groupDefs, groupLabel, parseSettingsView, secretIsSet } from "./parse";

const body = {
  data: {
    values: {
      "print.bill_footer_text": "Thank you",
      "appointment.default_duration_min": 15,
      "mail.enabled": false,
      "mail.encryption": "tls",
      "mail.password": { is_set: true },
    },
    schema: [
      { key: "print.bill_footer_text", group: "print", type: "string", label: "Bill footer", description: null, default: null, max_length: 500, secret: false, integration: false, enforced: true },
      { key: "appointment.default_duration_min", group: "appointment", type: "int", label: "Default duration", default: 15, min: 5, max: 240, secret: false, integration: false, enforced: true },
      { key: "mail.enabled", group: "mail", type: "bool", label: "Email on", default: false, secret: false, integration: true, enforced: false },
      { key: "mail.encryption", group: "mail", type: "enum", label: "Encryption", default: "tls", enum: ["none", "tls", "ssl"], secret: false, integration: true, enforced: false },
      { key: "mail.from_address", group: "mail", type: "email", label: "From address", default: null, max_length: 190, secret: false, integration: true, enforced: false },
      { key: "mail.password", group: "mail", type: "string", label: "Password", default: null, max_length: 255, secret: true, integration: true, enforced: false },
    ],
  },
};

const view = parseSettingsView(body);
const everything = () => true;
const none = new Set<string>();

describe("parseSettingsView", () => {
  it("reads the schema and the values", () => {
    expect(view.defs).toHaveLength(6);
    expect(view.defs[1]).toMatchObject({ key: "appointment.default_duration_min", type: "int", min: 5, max: 240, defaultValue: 15, enforced: true, integration: false });
    expect(view.defs[3].options).toEqual(["none", "tls", "ssl"]);
    expect(view.defs[5]).toMatchObject({ secret: true, integration: true, enforced: false });
    expect(view.values["appointment.default_duration_min"]).toBe(15);
  });
  it("reads a secret as set or not set, and never throws", () => {
    expect(secretIsSet(view.values["mail.password"])).toBe(true);
    expect(secretIsSet({ is_set: false })).toBe(false);
    expect(secretIsSet(undefined)).toBe(false);
    expect(parseSettingsView(null)).toEqual({ defs: [], values: {} });
  });
  it("groups in the server's order and names the groups", () => {
    expect(groupDefs(view.defs).map((g) => g.group)).toEqual(["print", "appointment", "mail"]);
    expect(groupLabel("mail")).toBe("Email (SMTP)");
    expect(groupLabel("some_new_group")).toBe("Some new group");
  });
});

describe("initialDraft", () => {
  it("starts from the values, with an empty secret", () => {
    const draft = initialDraft(view);
    expect(draft["print.bill_footer_text"]).toBe("Thank you");
    expect(draft["appointment.default_duration_min"]).toBe("15");
    expect(draft["mail.enabled"]).toBe(false);
    expect(draft["mail.password"]).toBe("");
    expect(defaultDraftValue(view.defs[1])).toBe("15");
    expect(defaultDraftValue(view.defs[0])).toBe("");
  });
});

describe("buildChanges", () => {
  it("sends only what was touched", () => {
    const draft = { ...initialDraft(view), "appointment.default_duration_min": "20" };
    expect(buildChanges(view, draft, new Set(["appointment.default_duration_min"]), none, everything).changes).toEqual({ "appointment.default_duration_min": 20 });
    expect(buildChanges(view, draft, none, none, everything).changes).toEqual({});
  });
  it("checks a number against its limits", () => {
    const draft = { ...initialDraft(view), "appointment.default_duration_min": "500" };
    const built = buildChanges(view, draft, new Set(["appointment.default_duration_min"]), none, everything);
    expect(built.errors["appointment.default_duration_min"]).toMatch(/5 to 240/);
    expect(built.changes).toEqual({});
  });
  it("sends an emptied box as null (back to the default)", () => {
    const draft = { ...initialDraft(view), "print.bill_footer_text": "  " };
    expect(buildChanges(view, draft, new Set(["print.bill_footer_text"]), none, everything).changes).toEqual({ "print.bill_footer_text": null });
  });
  it("sends a tick box as true or false", () => {
    const draft = { ...initialDraft(view), "mail.enabled": true };
    expect(buildChanges(view, draft, new Set(["mail.enabled"]), none, everything).changes).toEqual({ "mail.enabled": true });
  });
  it("checks an email address and an enum", () => {
    const draft = { ...initialDraft(view), "mail.from_address": "not an email", "mail.encryption": "weird" };
    const built = buildChanges(view, draft, new Set(["mail.from_address", "mail.encryption"]), none, everything);
    expect(built.errors["mail.from_address"]).toMatch(/email/);
    expect(built.errors["mail.encryption"]).toMatch(/listed/);
  });
  it("never sends an untouched or empty secret, sends a typed one, and removes on reset", () => {
    const base = initialDraft(view);
    expect(buildChanges(view, base, new Set(["mail.password"]), none, everything).changes).toEqual({});
    expect(buildChanges(view, { ...base, "mail.password": "s3cret!" }, new Set(["mail.password"]), none, everything).changes).toEqual({ "mail.password": "s3cret!" });
    expect(buildChanges(view, base, new Set(["mail.password"]), new Set(["mail.password"]), everything).changes).toEqual({ "mail.password": null });
  });
  it("leaves out a key this user may not change", () => {
    const draft = { ...initialDraft(view), "mail.enabled": true, "appointment.default_duration_min": "30" };
    const onlyGeneral = (def: { integration: boolean }) => !def.integration;
    const built = buildChanges(view, draft, new Set(["mail.enabled", "appointment.default_duration_min"]), none, onlyGeneral);
    expect(built.changes).toEqual({ "appointment.default_duration_min": 30 });
  });
});
