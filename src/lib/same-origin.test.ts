import { describe, expect, it } from "vitest";
import { isSameOrigin } from "./same-origin";

const request = (headers: Record<string, string>) => new Request("http://localhost:3000/api/x", { method: "POST", headers });

describe("isSameOrigin", () => {
  it("accepts the page's own address", () => {
    expect(isSameOrigin(request({ origin: "http://localhost:3000", host: "localhost:3000" }))).toBe(true);
  });
  it("accepts a request without an Origin (not a cross-site browser request)", () => {
    expect(isSameOrigin(request({ host: "localhost:3000" }))).toBe(true);
  });
  it("refuses another site", () => {
    expect(isSameOrigin(request({ origin: "http://evil.test", host: "localhost:3000" }))).toBe(false);
  });
  it("refuses an Origin that is not an address", () => {
    expect(isSameOrigin(request({ origin: "not a url", host: "localhost:3000" }))).toBe(false);
  });
  it("follows the forwarded host behind a proxy", () => {
    expect(isSameOrigin(request({ origin: "https://hms.example.org", host: "internal:3000", "x-forwarded-host": "hms.example.org" }))).toBe(true);
  });
});
