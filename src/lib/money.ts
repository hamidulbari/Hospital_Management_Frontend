const MONEY_RE = /^-?\d+\.\d{2}$/;
const INPUT_RE = /^\d+(\.\d{1,2})?$/;

export type MoneyFormatOptions = {
  currency?: string; // code from the hospital profile, e.g. "INR"
  grouping?: "international" | "indian";
};

function groupInternational(whole: string): string {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function groupIndian(whole: string): string {
  if (whole.length <= 3) return whole;
  const rest = whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${whole.slice(-3)}`;
}

/** Display a server amount ("1234.00"). Never parses to a number. Unknown shapes are returned unchanged. */
export function formatMoney(amount: string, options: MoneyFormatOptions = {}): string {
  if (!MONEY_RE.test(amount)) return amount;
  const negative = amount.startsWith("-");
  const [whole, fraction] = (negative ? amount.slice(1) : amount).split(".");
  const grouped = options.grouping === "indian" ? groupIndian(whole) : groupInternational(whole);
  const sign = negative ? "-" : "";
  const body = `${grouped}.${fraction}`;
  return options.currency ? `${sign}${options.currency} ${body}` : `${sign}${body}`;
}

/** Turn what the user typed into the string to send ("12.5" -> "12.50"). null = not a valid amount. */
export function normalizeMoneyInput(raw: string): string | null {
  const value = raw.trim();
  if (!INPUT_RE.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return `${whole}.${fraction.padEnd(2, "0")}`;
}