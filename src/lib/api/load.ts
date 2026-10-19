import "server-only";
import { apiFetch, type ApiRequest } from "./client";
import { ApiError, type ClientError } from "./errors";

export type LoadResult<T> = { ok: true; data: T } | { ok: false; error: ClientError };

/** redirect() still works (it is not an ApiError, so it passes through). */
export async function apiLoad<T = unknown>(path: string, request: ApiRequest = {}): Promise<LoadResult<T>> {
  try {
    return { ok: true, data: await apiFetch<T>(path, request) };
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, error: error.client };
    throw error;
  }
}