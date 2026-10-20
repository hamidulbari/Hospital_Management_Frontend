import { describe, expect, it } from "vitest";
import { checkDimensions, checkImageFile } from "./image-check";
import { parseBranding } from "./parse";

describe("checkImageFile", () => {
  it("accepts PNG, JPEG and WebP within the limit", () => {
    expect(checkImageFile("logo", { size: 500_000, type: "image/png" })).toBeNull();
    expect(checkImageFile("login_image", { size: 2_000_000, type: "image/webp" })).toBeNull();
  });
  it("refuses SVG, GIF and anything else", () => {
    expect(checkImageFile("logo", { size: 1000, type: "image/svg+xml" })).toMatch(/PNG, JPEG or WebP/);
    expect(checkImageFile("logo", { size: 1000, type: "image/gif" })).not.toBeNull();
    expect(checkImageFile("logo", { size: 1000, type: "" })).not.toBeNull();
  });
  it("applies a different limit to each kind", () => {
    expect(checkImageFile("logo", { size: 2 * 1024 * 1024, type: "image/png" })).toMatch(/1 MB/);
    expect(checkImageFile("login_image", { size: 2 * 1024 * 1024, type: "image/png" })).toBeNull();
    expect(checkImageFile("login_image", { size: 4 * 1024 * 1024, type: "image/png" })).toMatch(/3 MB/);
  });
  it("refuses an empty file", () => {
    expect(checkImageFile("logo", { size: 0, type: "image/png" })).toMatch(/empty/);
  });
});

describe("checkDimensions", () => {
  it("allows 16 to 4096 pixels on each side", () => {
    expect(checkDimensions(16, 16)).toBeNull();
    expect(checkDimensions(4096, 4096)).toBeNull();
    expect(checkDimensions(15, 100)).toMatch(/small/);
    expect(checkDimensions(100, 4097)).toMatch(/big/);
  });
});

describe("parseBranding", () => {
  it("turns the public answer into our own image addresses", () => {
    expect(
      parseBranding({ data: { hospital_name: "City Hospital", logo_url: "http://backend.test/api/v1/branding/files/logo?v=aa", login_image_url: null } }),
    ).toEqual({ hospitalName: "City Hospital", logoSrc: "/api/branding/logo?v=aa", loginImageSrc: null });
  });
  it("gives nothing for an answer without a hospital name", () => {
    expect(parseBranding({ data: {} })).toBeNull();
    expect(parseBranding(null)).toBeNull();
  });
});
