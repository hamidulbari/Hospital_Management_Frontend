import { TabsNav } from "@/components/ui/tabs-nav";
import { CHANNELS } from "@/features/settings/channels";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const p = session.permissions;

  // The channel tabs are only for people who may manage integrations: the server does not even send those keys to anyone else.
  const items = [
    can(p, "organization.hospital.view") ? { label: "General", href: "/settings" } : null,
    ...CHANNELS.map((channel) => (can(p, "organization.integration.manage") ? { label: channel.label, href: channel.href } : null)),
  ].filter((item): item is { label: string; href: string } => item !== null);

  return (
    <>
      <TabsNav items={items} label="Settings" />
      {children}
    </>
  );
}
