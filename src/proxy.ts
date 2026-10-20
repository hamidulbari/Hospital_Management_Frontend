import { NextResponse, type NextRequest } from "next/server";

// Cookie name is duplicated here on purpose (see lib/auth/constants.ts).
const SESSION_COOKIE = "hms_session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isLogin = pathname === "/login";

  if (!hasSession && !isLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (hasSession && isLogin) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

// api/branding is public on purpose: the login page shows the hospital's logo and image before anyone signs in.
// It only serves the two public pictures. api/hospital-branding (upload and remove) is NOT listed here, so it needs the cookie.
export const config = {
  matcher: ["/((?!api/auth|api/branding|_next/static|_next/image|favicon.ico).*)"],
};
