export type Rec = Record<string, unknown>;

export function rec(value: unknown): Rec {
  return typeof value === "object" && value !== null ? (value as Rec) : {};
}

export function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function strOrNull(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

export function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function bool(value: unknown): boolean {
  return value === true;
}

export function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}