export type Rec = Record<string, unknown>;

export function rec(value: unknown): Rec {
  return typeof value === "object" && value !== null ? (value as Rec) : {};
}

export function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}