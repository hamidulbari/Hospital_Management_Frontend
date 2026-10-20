import { groupDefs, type SettingsView } from "./parse";

export type ChannelGroup = "mail" | "sms" | "whatsapp";

export type Channel = {
  group: ChannelGroup;
  href: string;
  /** The name on the tab. */
  label: string;
  title: string;
  description: string;
  /** What the person has to get from the provider first. Guidance only. */
  need: string[];
};

export const CHANNELS: readonly Channel[] = [
  {
    group: "mail",
    href: "/settings/email",
    label: "Email",
    title: "Email (SMTP)",
    description: "The mail server the hospital's emails will be sent through.",
    need: [
      "The SMTP host and port of your mail provider (usually port 587 with TLS).",
      "A username and a password. Use an app password if your provider offers one.",
      "The address and the name the emails should come from.",
    ],
  },
  {
    group: "sms",
    href: "/settings/sms",
    label: "SMS",
    title: "SMS",
    description: "The SMS provider the hospital's text messages will be sent through.",
    need: [
      "The name of your SMS provider.",
      "An API key and an API secret from the provider.",
      "A sender ID of 3 to 11 letters or digits.",
      "In India, the DLT entity ID of your registered sender.",
    ],
  },
  {
    group: "whatsapp",
    href: "/settings/whatsapp",
    label: "WhatsApp",
    title: "WhatsApp",
    description: "The WhatsApp Business account the hospital's messages will be sent from.",
    need: [
      "The name of your provider (for example the WhatsApp Business platform).",
      "The phone number ID and the business account ID.",
      "An access token. Keep it private: it is never shown again after you save it.",
      "The language code of your approved message templates, for example en or en_GB.",
    ],
  },
];

export const CHANNEL_GROUPS: readonly string[] = CHANNELS.map((channel) => channel.group);

/** The groups of the General page: everything that is not a message channel (bills, appointments, reminders). */
export function generalGroups(view: SettingsView): string[] {
  return groupDefs(view.defs)
    .map((entry) => entry.group)
    .filter((group) => !CHANNEL_GROUPS.includes(group));
}
