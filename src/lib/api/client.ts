import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { ApiError, clientErrorFromResponse, networkError } from "./errors";

type Query = Record<string, string | number | boolean | null | undefined>;

export type ApiRequest = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
  /** Payments and reversals must pass one (new per attempt, reused on retry). Other writes get a fresh key. */
  idempotencyKey?: string;
  /** undefined = use the session cookie, null = send no token (login). */
  token?: string | null;
  /** Default true: on 401 go to /api/auth/session-expired. Server Actions and route handlers set false. */
  redirectOn401?: boolean;
};

function baseUrl(): string {
  const value = process.env.API_BASE_URL;
  if (!value) throw new Error("API_BASE_URL is not set. Add it to .env.local and restart.");
  return value.replace(/\/+$/, "");
}

function buildUrl(path: string, query?: Query): URL {
  const url = new URL(baseUrl() + path);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    }
  }
  return url;
}

/** The ONE place the browser-hidden token is attached. Server-side only. */
export async function apiFetch<T = unknown>(path: string, request: ApiRequest = {}): Promise<T> {
  const method = request.method ?? "GET";
  const token =
    request.token === undefined ? ((await cookies()).get(SESSION_COOKIE)?.value ?? null) : request.token;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (request.body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") headers["Idempotency-Key"] = request.idempotencyKey ?? crypto.randomUUID();

  let response: Response;
  try {
    response = await fetch(buildUrl(path, request.query), {
      method,
      headers,
      body: request.body !== undefined ? JSON.stringify(request.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    const error = networkError();
    console.error("API unreachable", { method, path });
    throw new ApiError(error);
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    const error = clientErrorFromResponse(response.status, json, response.headers.get("X-Correlation-Id"));
    if (error.unexpected) {
      // Path only (ids are fine), never the query string or the body.
      console.error("API error", { method, path, status: error.status, code: error.code, correlationId: error.correlationId });
    }
    if (response.status === 401 && token && (request.redirectOn401 ?? true)) {
      redirect("/api/auth/session-expired");
    }
    throw new ApiError(error);
  }

  return json as T;
}