import "server-only";
import type { Option } from "@/components/ui/select-field";
import { apiLoad } from "@/lib/api/load";
import type { ClientError } from "@/lib/api/errors";
import { getHospital } from "@/lib/hospital";
import type { ServiceIndex } from "./bill-groups";
import { fmt, type MoneyFormat } from "./money-format";
import { parseServices } from "./parse";

/** Currency comes from the hospital profile. Users who may not view it get plain amounts. */
export async function loadMoneyFormat(): Promise<MoneyFormat> {
  const hospital = await getHospital();
  const currency = hospital?.currencyCode || undefined;
  return { currency, grouping: currency === "INR" ? "indian" : "international" };
}

/** Active services for the line picker: "CODE - Name (price)". Needs billing.service.view. */
export async function loadServiceOptions(format: MoneyFormat): Promise<{ options: Option[]; error: ClientError | null }> {
  const result = await apiLoad<unknown>("/billing/services", { query: { active: true, per_page: 200 } });
  if (!result.ok) return { options: [], error: result.error };
  const options = parseServices(result.data).items.map((service) => ({
    value: service.id,
    label: `${service.code} — ${service.name} (${fmt(service.unitPrice, format)})`,
  }));
  return { options, error: null };
}

/** Code and category of every service (also inactive ones), to head the lines of a printed bill. Empty when not allowed. */
export async function loadServiceIndex(): Promise<ServiceIndex> {
  const result = await apiLoad<unknown>("/billing/services", { query: { per_page: 200 } });
  if (!result.ok) return {};
  const index: ServiceIndex = {};
  for (const service of parseServices(result.data).items) {
    if (service.id) index[service.id] = { code: service.code, category: service.category };
  }
  return index;
}