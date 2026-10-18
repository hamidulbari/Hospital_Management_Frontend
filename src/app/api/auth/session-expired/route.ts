import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

// Server Components cannot delete cookies, so a 401 sends the browser here to clear it.
export function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login?reason=expired", request.url), 303);
  response.cookies.set({ name: SESSION_COOKIE, value: "", maxAge: 0, path: "/" });
  return response;
}