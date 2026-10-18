import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api/client";
import { SESSION_COOKIE } from "@/lib/auth/constants";

export async function POST(request: Request) {
  try {
    await apiFetch("/identity/logout", { method: "POST", redirectOn401: false });
  } catch {
    // The token may already be invalid. We still sign the user out here.
  }
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.set({ name: SESSION_COOKIE, value: "", maxAge: 0, path: "/" });
  return response;
}