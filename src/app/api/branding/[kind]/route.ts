import { NextResponse } from "next/server";
import { apiBaseUrl } from "@/lib/api/base-url";
import { isBrandingToken } from "@/lib/branding";

const KINDS = ["logo", "login_image"];
const TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 4 * 1024 * 1024;

const empty = (status: number) => new NextResponse(null, { status });

/**
 * The hospital's logo and login image, for everyone (the login page needs them before anyone signs in).
 * The browser asks THIS app; the picture is fetched from the backend here, on the server, using only our own backend address.
 * No token is sent and nothing about patients can be reached through this route.
 */
export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!KINDS.includes(kind)) return empty(404);

  const incoming = new URL(request.url).searchParams;
  const version = incoming.get("v") ?? "";
  const code = incoming.get("code") ?? "";
  if ((version && !isBrandingToken(version)) || (code && !isBrandingToken(code))) return empty(400);

  let target: URL;
  try {
    target = new URL(`${apiBaseUrl()}/branding/files/${kind}`);
  } catch {
    return empty(500);
  }
  if (version) target.searchParams.set("v", version);
  if (code) target.searchParams.set("code", code);

  let upstream: Response;
  try {
    upstream = await fetch(target, { headers: { Accept: "image/*" }, cache: "no-store", signal: AbortSignal.timeout(10_000) });
  } catch {
    return empty(502);
  }
  if (!upstream.ok) return empty(upstream.status === 404 ? 404 : 502);

  const type = (upstream.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!TYPES.includes(type)) return empty(502);

  const bytes = await upstream.arrayBuffer();
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) return empty(502);

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": type,
      // The address carries a version marker that changes with the picture, so a versioned picture can be kept for long.
      "Cache-Control": version ? "public, max-age=31536000, immutable" : "public, max-age=60",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
    },
  });
}
