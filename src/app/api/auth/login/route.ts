import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api/client";
import { toClientError, type ClientError } from "@/lib/api/errors";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/constants";
import { parseMe } from "@/lib/auth/me";
import { loginSchema } from "@/features/auth/schemas";
import { rec, str } from "@/lib/utils/guards";

function errorResponse(error: ClientError, status?: number) {
  const details = Object.fromEntries(Object.entries(error.fieldErrors).map(([path, message]) => [path, [message]]));
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.serverMessage || error.message,
        details,
        correlation_id: error.correlationId,
      },
    },
    { status: status ?? (error.status === 0 ? 502 : error.status) },
  );
}

export async function POST(request: Request) {
  const input = loginSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return errorResponse({
      status: 422,
      code: "validation_failed",
      message: "Enter your email and password.",
      serverMessage: "",
      fieldErrors: {},
      correlationId: null,
      unexpected: false,
    });
  }

  try {
    const login = await apiFetch<unknown>("/identity/login", { method: "POST", body: input.data, token: null });
    const token = str(rec(rec(login).data).token);
    if (!token) {
      return errorResponse({ ...toClientError(null), message: "Unexpected answer from the server." }, 502);
    }

    const me = parseMe(await apiFetch<unknown>("/identity/me", { token, redirectOn401: false }));

    // The browser gets the user and permissions only. The token stays in the httpOnly cookie.
    const response = NextResponse.json({
      user: { id: me.id, name: me.name, email: me.email, mustChangePassword: me.mustChangePassword },
      permissions: me.permissions,
    });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    return errorResponse(toClientError(error));
  }
}