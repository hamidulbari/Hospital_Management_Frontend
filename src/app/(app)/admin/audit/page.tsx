import { EmptyState } from "@/components/ui/empty-state";
import { NoAccess } from "@/components/ui/no-access";
import { ErrorNotice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { UrlPagination } from "@/components/ui/url-pagination";
import { AuditFilters } from "@/features/audit/audit-filters";
import { readAuditFilters } from "@/features/audit/filters";
import { parseAuditEvents } from "@/features/audit/parse";
import { parseUserList } from "@/features/identity/parse";
import { apiLoad } from "@/lib/api/load";
import { requireSession } from "@/lib/auth/session";
import { humanize } from "@/lib/format";
import { showInstant } from "@/lib/format-instant";
import { hospitalNow } from "@/lib/hospital";
import { can } from "@/lib/permissions";

const PAGE_SIZE = 25;

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireSession();
  const p = session.permissions;
  if (!can(p, "audit.event.view")) return <NoAccess />;

  const f = readAuditFilters(await searchParams);
  const [result, usersResult, now] = await Promise.all([
    apiLoad<unknown>("/audit/events", {
      query: {
        action: f.action,
        actor: f.actor,
        resource_type: f.resourceType,
        resource_id: f.resourceId,
        outcome: f.outcome,
        correlation_id: f.correlationId,
        from: f.from,
        to: f.to,
        per_page: PAGE_SIZE,
        page: f.page,
      },
    }),
    can(p, "identity.user.view") ? apiLoad<unknown>("/identity/users", { query: { per_page: 100 } }) : Promise.resolve(null),
    hospitalNow(),
  ]);
  const list = result.ok ? parseAuditEvents(result.data) : null;
  const users = usersResult && usersResult.ok ? parseUserList(usersResult.data).items.map((u) => ({ value: u.id, label: u.name || u.email })) : [];
  // The audit trail names its actor by id only. The names come from the users list when the viewer may read it.
  const names = new Map(users.map((u) => [u.value, u.label]));

  function whoOf(actorId: string, actorType: string): string {
    const known = names.get(actorId);
    if (known) return known;
    if (actorType && actorType !== "user") return humanize(actorType);
    return actorId ? `${actorId.slice(0, 8)}\u2026` : "\u2014";
  }

  return (
    <>
      <PageHeader title="Audit trail" description="Who opened or changed what. Read only: nobody can add, change or delete an entry." />
      <AuditFilters
        initial={{ action: f.action, actor: f.actor, resource_type: f.resourceType, resource_id: f.resourceId, outcome: f.outcome, correlation_id: f.correlationId, from: f.from, to: f.to }}
        users={users}
      />

      {!result.ok ? (
        <ErrorNotice error={result.error} />
      ) : list && list.items.length === 0 ? (
        <EmptyState title="No entries" description="Nothing matches these filters." />
      ) : list ? (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto border border-ink bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink font-headline text-xs uppercase tracking-wider">
                <tr>
                  <th scope="col" className="p-3">When</th>
                  <th scope="col" className="p-3">Who</th>
                  <th scope="col" className="p-3">Action</th>
                  <th scope="col" className="p-3">Resource</th>
                  <th scope="col" className="p-3">Outcome</th>
                  <th scope="col" className="p-3">Reference</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((event, index) => (
                  <tr key={event.id || index} className="border-b border-accent align-top last:border-b-0 hover:bg-section-soft">
                    <td className="p-3 whitespace-nowrap text-muted">{showInstant(event.at, now.timezone) || "\u2014"}</td>
                    <td className="p-3">{whoOf(event.actorId, event.actorType)}</td>
                    <td className="p-3">
                      <span className="font-medium">{event.action || "\u2014"}</span>
                      {event.module ? <span className="block text-xs text-muted">{event.module}</span> : null}
                    </td>
                    <td className="p-3">
                      {event.resourceType || "\u2014"}
                      {event.resourceId ? <span className="block break-all text-xs text-muted">{event.resourceId}</span> : null}
                    </td>
                    <td className="p-3">
                      <StatusBadge label={humanize(event.outcome || "unknown")} tone={event.outcome === "success" ? "active" : event.outcome === "denied" ? "neutral" : "bad"} />
                    </td>
                    <td className="p-3 break-all text-xs text-muted">{event.correlationId || "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <UrlPagination page={list.currentPage} lastPage={list.lastPage} total={list.total} pageSize={PAGE_SIZE} />
        </div>
      ) : null}
    </>
  );
}
