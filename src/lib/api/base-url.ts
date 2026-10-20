import "server-only";

/** The backend address. Server side only: the browser never sees it. */
export function apiBaseUrl(): string {
  const value = process.env.API_BASE_URL;
  if (!value) throw new Error("API_BASE_URL is not set. Add it to .env.local and restart.");
  return value.replace(/\/+$/, "");
}
