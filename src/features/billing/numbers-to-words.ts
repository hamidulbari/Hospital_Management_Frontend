const ONES = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function below100(n: number): string {
  if (n < 20) return ONES[n];
  const ones = n % 10;
  return ones ? `${TENS[Math.floor(n / 10)]}-${ONES[ones]}` : TENS[Math.floor(n / 10)];
}

function below1000(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest) parts.push(below100(rest));
  return parts.join(" ");
}

/** Whole rupees as words in the Indian system (thousand, lakh, crore), from the DIGITS of the amount. "" when too large. */
export function integerToWordsIndian(digits: string): string {
  const clean = digits.replace(/^0+(?=\d)/, "");
  if (!/^\d+$/.test(clean) || clean.length > 10) return "";
  if (/^0+$/.test(clean)) return ONES[0];

  const hundreds = Number(clean.slice(-3));
  const thousands = Number(clean.slice(-5, -3) || "0");
  const lakhs = Number(clean.slice(-7, -5) || "0");
  const crores = Number(clean.slice(0, -7) || "0");

  const parts: string[] = [];
  if (crores) parts.push(`${below1000(crores)} Crore`);
  if (lakhs) parts.push(`${below100(lakhs)} Lakh`);
  if (thousands) parts.push(`${below100(thousands)} Thousand`);
  if (hundreds) parts.push(below1000(hundreds));
  return parts.join(" ");
}

/** "2124.00" -> "Two Thousand One Hundred Twenty-Four Rupees Only". It only writes the amount in letters: no arithmetic. */
export function amountInWords(amount: string, currency?: string): string {
  const match = /^(\d+)\.(\d{2})$/.exec(amount.trim());
  if (!match) return "";
  const whole = integerToWordsIndian(match[1]);
  if (!whole) return "";
  const minor = Number(match[2]);

  if (currency === "INR") {
    return `${whole} Rupees${minor ? ` and ${below100(minor)} Paise` : ""} Only`;
  }
  return `${whole}${minor ? ` and ${match[2]}/100` : ""} Only`;
}