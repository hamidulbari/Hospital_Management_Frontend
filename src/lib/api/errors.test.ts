import { describe, expect, it } from "vitest";
import { ApiError, clientErrorFromResponse, networkError, toClientError } from "./errors";

describe("clientErrorFromResponse", () => {
  it("maps validation details to the first message per field", () => {
    const body = {
      error: {
        code: "validation_failed",
        message: "The given data was invalid.",
        details: { "lines.0.unit_price": ["Too many decimals.", "Other."] },
        correlation_id: "01ABC",
      },
    };
    const e = clientErrorFromResponse(422, body, null);
    expect(e.fieldErrors["lines.0.unit_price"]).toBe("Too many decimals.");
    expect(e.unexpected).toBe(false);
    expect(e.correlationId).toBe("01ABC");
  });

  it("prefers the header correlation id", () => {
    const e = clientErrorFromResponse(500, { error: { code: "x", correlation_id: "body" } }, "header");
    expect(e.correlationId).toBe("header");
  });

  it("uses friendly text for known codes", () => {
    expect(clientErrorFromResponse(403, { error: { code: "forbidden" } }, null).message).toBe(
      "You do not have permission to do this.",
    );
    expect(clientErrorFromResponse(409, { error: { code: "slot_unavailable" } }, null).unexpected).toBe(false);
  });

  it("treats 429 as expected", () => {
    const e = clientErrorFromResponse(429, null, null);
    expect(e.code).toBe("rate_limited");
    expect(e.unexpected).toBe(false);
  });

  it("flags server errors and unknown bodies as unexpected", () => {
    expect(clientErrorFromResponse(500, null, null).unexpected).toBe(true);
    expect(clientErrorFromResponse(500, null, null).message).toBe("Something went wrong.");
  });

  it("can keep the server wording (login)", () => {
    const e = clientErrorFromResponse(401, { error: { code: "unauthenticated", message: "Wrong email or password." } }, null, {
      preferServerMessage: true,
    });
    expect(e.message).toBe("Wrong email or password.");
    expect(e.unexpected).toBe(false);
  });
});

describe("toClientError", () => {
  it("unwraps ApiError and wraps anything else", () => {
    expect(toClientError(new ApiError(networkError())).code).toBe("network_error");
    expect(toClientError(new Error("boom")).unexpected).toBe(true);
  });
});