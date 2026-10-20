import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { checkImageFile } from "@/features/branding/image-check";
import { apiBaseUrl } from "@/lib/api/base-url";
import { isNextControlFlowError } from "@/lib/api/result";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { getSession } from "@/lib/auth/session";
import type { BrandingKind } from "@/lib/branding";
import { getHospitalId } from "@/lib/hospital";
import { can } from "@/lib/permissions";
import { isSameOrigin } from "@/lib/same-origin";

const KINDS: readonly string[] = ["logo", "login_image"];

/** Same shape as the backend's errors, so the screen can read it the same way. */
function problem(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message, details: {}, correlation_id: null } }, { status });
}

type Context = { token: string; hospitalId: string } | NextResponse;

/** Common checks: same origin, signed in, allowed to manage the hospital. The backend checks all of it again. */
async function context(request: Request): Promise<Context> {
  if (!isSameOrigin(request)) return problem(403, "forbidden", "This request was not allowed.");
  try {
    const session = await getSession();
    if (!session) return problem(401, "unauthenticated", "Your session has expired. Please sign in again.");
    if (!can(session.permissions, "organization.hospital.manage")) return problem(403, "forbidden", "You do not have permission to do this.");
    const hospitalId = await getHospitalId();
    if (!hospitalId) return problem(404, "not_found", "No hospital was found for this account.");
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return problem(401, "unauthenticated", "Your session has expired. Please sign in again.");
    return { token, hospitalId };
  } catch (error) {
    // An expired token makes the session call redirect: for a script that means "not signed in".
    if (isNextControlFlowError(error)) return problem(401, "unauthenticated", "Your session has expired. Please sign in again.");
    throw error;
  }
}

async function passThrough(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  const correlation = response.headers.get("X-Correlation-Id");
  return NextResponse.json(body ?? { error: { code: "unexpected", message: "The upload failed." } }, {
    status: response.status,
    headers: correlation ? { "X-Correlation-Id": correlation } : undefined,
  });
}

/** Upload one picture: multipart with "kind" (logo or login_image) and "file". The token never reaches the browser. */
export async function POST(request: Request) {
  const ctx = await context(request);
  if (ctx instanceof NextResponse) return ctx;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return problem(422, "validation_failed", "The upload could not be read.");
  }

  const kind = form.get("kind");
  const file = form.get("file");
  if (typeof kind !== "string" || !KINDS.includes(kind)) return problem(422, "validation_failed", "Unknown picture.");
  if (!(file instanceof File)) return problem(422, "validation_failed", "Choose an image.");
  const message = checkImageFile(kind as BrandingKind, file);
  if (message) return problem(422, "validation_failed", message);

  // Only the one file goes on, under a plain name. The backend reads the real bytes of it and is the judge.
  const upstream = new FormData();
  upstream.set(kind, file, "image");

  try {
    const response = await fetch(`${apiBaseUrl()}/organization/hospitals/${ctx.hospitalId}/branding`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ctx.token}`, Accept: "application/json" },
      body: upstream,
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return passThrough(response);
    return NextResponse.json({ ok: true });
  } catch {
    return problem(502, "network_error", "Could not reach the server. Check the connection and try again.");
  }
}

/** Remove one picture: DELETE ?kind=logo or ?kind=login_image. */
export async function DELETE(request: Request) {
  const ctx = await context(request);
  if (ctx instanceof NextResponse) return ctx;

  const kind = new URL(request.url).searchParams.get("kind") ?? "";
  if (!KINDS.includes(kind)) return problem(422, "validation_failed", "Unknown picture.");

  try {
    const response = await fetch(`${apiBaseUrl()}/organization/hospitals/${ctx.hospitalId}/branding/${kind}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${ctx.token}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return passThrough(response);
    return new NextResponse(null, { status: 204 });
  } catch {
    return problem(502, "network_error", "Could not reach the server. Check the connection and try again.");
  }
}
