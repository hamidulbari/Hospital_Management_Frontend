import { parsePage, type PageInfo } from "@/lib/api/meta";
import { list, rec, str, strOrNull } from "@/lib/utils/guards";

export type AuditEvent = {
  id: string;
  at: string | null;
  module: string;
  actorId: string;
  actorType: string;
  action: string;
  resourceType: string;
  resourceId: string;
  outcome: string;
  correlationId: string;
};

/** Real shape: actor is { id, type } (no name) and resource is { type, id }. */
export function parseAuditEvents(body: unknown): { items: AuditEvent[] } & PageInfo {
  const items = list(rec(body).data).map((raw) => {
    const e = rec(raw);
    const actor = rec(e.actor);
    const resource = rec(e.resource);
    return {
      id: str(e.id),
      at: strOrNull(e.occurred_at) ?? strOrNull(e.created_at),
      module: str(e.module),
      actorId: str(actor.id),
      actorType: str(actor.type),
      action: str(e.action),
      resourceType: str(resource.type) || str(e.resource_type),
      resourceId: str(resource.id) || str(e.resource_id),
      outcome: str(e.outcome),
      correlationId: str(e.correlation_id),
    };
  });
  return { items, ...parsePage(body, items.length) };
}
