import { parseIso } from "@/lib/calendar";
import { firstParam, readPage } from "@/lib/page-param";

export const OUTCOMES = ["success", "denied", "error"] as const;

export type AuditFilters = {
  action: string;
  actor: string;
  resourceType: string;
  resourceId: string;
  outcome: string;
  correlationId: string;
  from: string;
  to: string;
  page: number;
};

const ID_RE = /^[0-9a-z]{26}$/i;

/** Reads the address safely. Anything invalid is left out. Resource ids are ids, not patient data. */
export function readAuditFilters(raw: Record<string, string | string[] | undefined>): AuditFilters {
  const outcome = firstParam(raw.outcome);
  const actor = firstParam(raw.actor);
  const correlation = firstParam(raw.correlation_id);
  const from = firstParam(raw.from);
  const to = firstParam(raw.to);
  return {
    action: firstParam(raw.action).trim().slice(0, 80),
    actor: ID_RE.test(actor) ? actor : "",
    resourceType: firstParam(raw.resource_type).trim().slice(0, 60),
    resourceId: firstParam(raw.resource_id).trim().slice(0, 64),
    outcome: (OUTCOMES as readonly string[]).includes(outcome) ? outcome : "",
    correlationId: ID_RE.test(correlation) ? correlation : "",
    from: parseIso(from) ? from : "",
    to: parseIso(to) ? to : "",
    page: readPage(raw.page),
  };
}