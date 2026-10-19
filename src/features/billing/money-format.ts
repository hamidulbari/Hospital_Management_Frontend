import { formatMoney } from "@/lib/money";

export type MoneyFormat = { currency?: string; grouping: "indian" | "international" };

/** Shows a server amount. Never calculates. Empty becomes a dash. */
export function fmt(value: string, format: MoneyFormat): string {
  return value ? formatMoney(value, { currency: format.currency, grouping: format.grouping }) : "—";
}

export function isZeroMoney(value: string): boolean {
  return /^-?0+(\.0+)?$/.test(value);
}