import { EmptyState } from "@/components/ui/empty-state";
import { NoAccess } from "@/components/ui/no-access";
import { ErrorNotice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { BrandingPanel } from "@/features/branding/branding-panel";
import { loadBranding } from "@/features/branding/server";
import { parseSettingsView } from "@/features/settings/parse";
import { SettingsForm } from "@/features/settings/settings-form";
import { apiLoad } from "@/lib/api/load";
import { requireSession } from "@/lib/auth/session";
import { getHospitalId } from "@/lib/hospital";
import { can } from "@/lib/permissions";

export default async function SettingsPage() {
  const session = await requireSession();
  const p = session.permissions;
  if (!can(p, "organization.hospital.view")) return <NoAccess />;

  const hospitalId = await getHospitalId();
  if (!hospitalId) return <EmptyState title="No hospital" description="No hospital was found for this account." />;

  const [settings, branding] = await Promise.all([
    apiLoad<unknown>(`/organization/hospitals/${hospitalId}/settings`),
    loadBranding({ fresh: true }),
  ]);

  return (
    <>
      <PageHeader title="Settings" description="The hospital's logo and pictures, and how the hospital works." />

      <div className="flex flex-col gap-10">
        <Section title="Logo and pictures">
          <BrandingPanel
            logoSrc={branding?.logoSrc ?? null}
            loginImageSrc={branding?.loginImageSrc ?? null}
            canManage={can(p, "organization.hospital.manage")}
          />
        </Section>

        <Section title="Hospital settings">
          {settings.ok ? (
            <SettingsForm
              initial={parseSettingsView(settings.data)}
              canGeneral={can(p, "organization.hospital.manage")}
              canIntegration={can(p, "organization.integration.manage")}
            />
          ) : (
            <ErrorNotice error={settings.error} />
          )}
        </Section>
      </div>
    </>
  );
}
