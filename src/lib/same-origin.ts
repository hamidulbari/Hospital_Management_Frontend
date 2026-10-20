/**
 * A simple protection for route handlers that change things (Server Actions do this by themselves).
 * A browser sends the page's own address in "Origin": it must be this server. No Origin means it is not a cross-site browser request.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return Boolean(host) && new URL(origin).host === host;
  } catch {
    return false;
  }
}
