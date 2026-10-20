export type BrandingKind = "logo" | "login_image";

const TOKEN = /^[A-Za-z0-9._-]{1,64}$/;

/** True for the version marker and the hospital code that go into an image address. */
export function isBrandingToken(value: string): boolean {
  return TOKEN.test(value);
}

/**
 * The backend gives a full address for an image. The browser must only talk to this app, so keep just
 * the version marker ("v") and the hospital code and point at our own route, which fetches the image on the server.
 */
export function toLocalSrc(url: string | null | undefined, kind: BrandingKind): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url, "http://local.invalid");
  } catch {
    return null;
  }
  const params = new URLSearchParams();
  const version = parsed.searchParams.get("v");
  const code = parsed.searchParams.get("code");
  if (version && isBrandingToken(version)) params.set("v", version);
  if (code && isBrandingToken(code)) params.set("code", code);
  const query = params.toString();
  return `/api/branding/${kind}${query ? `?${query}` : ""}`;
}
