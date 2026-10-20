import { describe, expect, it } from "vitest";
import { isBrandingToken, toLocalSrc } from "./branding";

describe("toLocalSrc", () => {
  it("points at our own route and keeps only the version and the code", () => {
    expect(toLocalSrc("http://backend.test/api/v1/branding/files/logo?code=C1&v=abc123", "logo")).toBe("/api/branding/logo?v=abc123&code=C1");
    expect(toLocalSrc("http://backend.test/x?v=1", "login_image")).toBe("/api/branding/login_image?v=1");
    expect(toLocalSrc("/api/v1/branding/files/logo", "logo")).toBe("/api/branding/logo");
  });
  it("drops anything odd and never copies the backend address", () => {
    expect(toLocalSrc("http://evil.test/x?v=<script>&code=a b", "logo")).toBe("/api/branding/logo");
    expect(toLocalSrc("http://evil.test/x", "logo")).not.toContain("evil.test");
  });
  it("gives nothing for an empty address", () => {
    expect(toLocalSrc(null, "logo")).toBeNull();
    expect(toLocalSrc(undefined, "logo")).toBeNull();
    expect(toLocalSrc("", "logo")).toBeNull();
  });
});

describe("isBrandingToken", () => {
  it("accepts a short safe token only", () => {
    expect(isBrandingToken("abc-123_X.y")).toBe(true);
    expect(isBrandingToken("")).toBe(false);
    expect(isBrandingToken("a b")).toBe(false);
    expect(isBrandingToken("a".repeat(65))).toBe(false);
  });
});
