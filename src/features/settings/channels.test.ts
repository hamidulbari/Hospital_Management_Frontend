import { describe, expect, it } from "vitest";
import { CHANNELS, CHANNEL_GROUPS, generalGroups } from "./channels";
import { parseSettingsView } from "./parse";

const def = (key: string, group: string) => ({ key, group, type: "string", label: key, secret: false, integration: false, enforced: true });

describe("channels", () => {
  it("has one tab each for email, SMS and WhatsApp, with what to ask the provider for", () => {
    expect(CHANNELS.map((c) => c.group)).toEqual(["mail", "sms", "whatsapp"]);
    expect(CHANNELS.map((c) => c.href)).toEqual(["/settings/email", "/settings/sms", "/settings/whatsapp"]);
    expect(CHANNELS.every((c) => c.need.length >= 3)).toBe(true);
    expect(CHANNEL_GROUPS).toEqual(["mail", "sms", "whatsapp"]);
  });
  it("keeps the message channels out of the General page", () => {
    const view = parseSettingsView({
      data: {
        values: {},
        schema: [def("print.bill_footer_text", "print"), def("mail.host", "mail"), def("appointment.default_duration_min", "appointment"), def("sms.provider", "sms"), def("notify.appointment_reminder_hours", "notify")],
      },
    });
    expect(generalGroups(view)).toEqual(["print", "appointment", "notify"]);
  });
  it("is empty when there is nothing", () => {
    expect(generalGroups(parseSettingsView(null))).toEqual([]);
  });
});
