export function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/** ?page= as a whole number from 1. Anything else is page 1. */
export function readPage(value: string | string[] | undefined): number {
  const n = Number(firstParam(value));
  return Number.isInteger(n) && n >= 1 && n <= 10_000 ? n : 1;
}