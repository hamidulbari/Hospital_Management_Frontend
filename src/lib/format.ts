/** "data_sharing" -> "Data sharing" (fallback when no fixed label exists). */
export function humanize(code: string): string {
  const text = code.replace(/_/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}