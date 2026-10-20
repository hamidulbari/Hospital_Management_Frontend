import "server-only";
import { apiLoad } from "@/lib/api/load";
import { parseBranding, type Branding } from "./parse";

let cached: { at: number; value: Branding | null } | null = null;

// The backend allows 60 reads a minute per address, and every visitor of the login page goes through this one server.
const TTL_MS = 30_000;

/**
 * GET /branding (public, no token): the hospital name, logo and login image. null when it cannot be read:
 * the login page then simply shows its plain design. With several hospitals installed set HOSPITAL_CODE in .env.local.
 * "fresh" skips the short cache (the Settings page uses it so a new upload shows at once).
 */
export async function loadBranding(options: { fresh?: boolean } = {}): Promise<Branding | null> {
  if (!options.fresh && cached && Date.now() - cached.at < TTL_MS) return cached.value;

  const code = process.env.HOSPITAL_CODE?.trim();
  const result = await apiLoad<unknown>("/branding", { token: null, query: { code: code || undefined } });
  const value = result.ok ? parseBranding(result.data) : null;
  cached = { at: Date.now(), value };
  return value;
}
