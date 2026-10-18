import { rec, str } from "@/lib/utils/guards";

export type FieldErrors = Record<string, string>;

export type ClientError = {
  status: number; // 0 = the server could not be reached
  code: string;
  message: string; // text for the screen
  serverMessage: string; // raw text from the API
  fieldErrors: FieldErrors; // first message per field path, e.g. "lines.0.unit_price"
  correlationId: string | null;
  unexpected: boolean; // true: show the reference id
};

const KNOWN_MESSAGES: Record<string, string> = {
  unauthenticated: "Your session has expired. Please sign in again.",
  forbidden: "You do not have permission to do this.",
  not_found: "This item could not be found.",
  validation_failed: "Please correct the highlighted fields.",
  slot_unavailable: "This time slot is no longer available. Please choose another one.",
  possible_duplicate: "A similar record already exists. Please check before continuing.",
  idempotency_key_required: "This request could not be sent safely. Please reload the page and try again.",
  idempotency_key_reused: "This request was already used with different details. Please reload the page and try again.",
};

const RATE_LIMITED = "Too many requests. Please wait a moment and try again.";

function toFieldErrors(details: unknown): FieldErrors {
  const out: FieldErrors = {};
  for (const [path, value] of Object.entries(rec(details))) {
    const first = Array.isArray(value) ? value.find((v) => typeof v === "string") : value;
    if (typeof first === "string" && first) out[path] = first;
  }
  return out;
}

export function clientErrorFromResponse(
  status: number,
  body: unknown,
  headerCorrelationId: string | null,
  options: { preferServerMessage?: boolean } = {},
): ClientError {
  const e = rec(rec(body).error);
  const code = str(e.code) || (status === 429 ? "rate_limited" : "unexpected");
  const serverMessage = str(e.message);
  const known = status === 429 ? RATE_LIMITED : KNOWN_MESSAGES[code];
  const unexpected = status === 0 || status >= 500 || (!known && status !== 401 && status !== 422);
  const message =
    options.preferServerMessage && serverMessage ? serverMessage : (known ?? "Something went wrong.");

  return {
    status,
    code,
    message,
    serverMessage,
    fieldErrors: toFieldErrors(e.details),
    correlationId: headerCorrelationId || str(e.correlation_id) || null,
    unexpected,
  };
}

export function networkError(): ClientError {
  return {
    status: 0,
    code: "network_error",
    message: "Could not reach the server. Check the connection and try again.",
    serverMessage: "",
    fieldErrors: {},
    correlationId: null,
    unexpected: true,
  };
}

export class ApiError extends Error {
  readonly client: ClientError;

  constructor(client: ClientError) {
    super(client.correlationId ? `${client.message} (reference ${client.correlationId})` : client.message);
    this.name = "ApiError";
    this.client = client;
  }
}

export function toClientError(error: unknown): ClientError {
  if (error instanceof ApiError) return error.client;
  return {
    status: 500,
    code: "unexpected",
    message: "Something went wrong.",
    serverMessage: "",
    fieldErrors: {},
    correlationId: null,
    unexpected: true,
  };
}