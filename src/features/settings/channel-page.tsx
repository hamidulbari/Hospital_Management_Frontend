import { EmptyState } from "@/components/ui/empty-state";
import { NoAccess } from "@/components/ui/no-access";
import { ErrorNotice, Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { apiLoad } from "@/lib/api/load";
import { requireSession } from "@/lib/auth/session";
import { getHospitalId } from "@/lib/hospital";
import { can } from "@/lib/permissions";
import { CHANNELS, type ChannelGroup } from "./channels";
import { parseSettingsView } from "./parse";
import { SettingsForm } from "./settings-form";

/**
 * The page of one message channel. The fields come from the server's schema (only the keys of this channel's group).
 * A user without organization.integration.manage does not even receive these keys, so they get "no access" here.
 */
export async function ChannelSettingsPage({ group }: { group: ChannelGroup }) {
  const channel = CHANNELS.find((c) => c.group === group);
  if (!channel) return <NoAccess />;

  const session = await requireSession();
  const p = session.permissions;
  if (!can(p, "organization.hospital.view") || !can(p, "organization.integration.manage")) return <NoAccess />;

  const hospitalId = await getHospitalId();
  if (!hospitalId) return <EmptyState title="No hospital" description="No hospital was found for this account." />;

  const result = await apiLoad<unknown>(`/organization/hospitals/${hospitalId}/settings`);
  if (!result.ok) return <ErrorNotice error={result.error} />;

  const view = parseSettingsView(result.data);
  const defs = view.defs.filter((def) => def.group === group);
  const enabledKey = `${group}.enabled`;
  const enabled = view.values[enabledKey] === true;

  return (
    <>
      <PageHeader
        title={channel.title}
        description={channel.description}
        actions={<StatusBadge label={enabled ? "Switched on" : "Switched off"} tone={enabled ? "active" : "muted"} />}
      />

      <div className="flex flex-col gap-8">
        <Notice>
          These settings are only saved for now. Nothing sends {channel.label === "Email" ? "emails" : `${channel.label} messages`} yet, because the notification part of
          the system is not built. When it is, it will use what you save here. For that reason there is no test button.
        </Notice>

        <section className="border border-ink bg-surface p-6">
          <h2 className="font-headline text-sm font-bold uppercase tracking-wider text-ink">What you need from your provider</h2>
          <ul className="mt-3 list-disc pl-5 text-sm text-ink">
            {channel.need.map((line) => (
              <li key={line} className="mt-1 first:mt-0">
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">
            Passwords, keys and tokens are kept encrypted on the server. After you save one it can never be read again: you can only replace it or remove it. A channel
            cannot be switched on until its essential fields are filled in.
          </p>
        </section>

        {defs.length === 0 ? (
          <EmptyState title="Nothing to set here" description="The server did not offer any setting for this channel." />
        ) : (
          <SettingsForm
            initial={view}
            canGeneral={can(p, "organization.hospital.manage")}
            canIntegration={can(p, "organization.integration.manage")}
            groups={[group]}
            quiet
            hideGroupTitle
          />
        )}
      </div>
    </>
  );
}
