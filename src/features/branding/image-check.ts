import type { BrandingKind } from "@/lib/branding";

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

/** The server's limits. The server is still the judge: it reads the real bytes of the file. These checks only give a friendly message early. */
export const LIMITS: Record<BrandingKind, { bytes: number; label: string }> = {
  logo: { bytes: 1024 * 1024, label: "1 MB" },
  login_image: { bytes: 3 * 1024 * 1024, label: "3 MB" },
};

export const MIN_SIDE = 16;
export const MAX_SIDE = 4096;

export function checkImageFile(kind: BrandingKind, file: { size: number; type: string }): string | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Choose a PNG, JPEG or WebP image. SVG and other types are not accepted.";
  }
  if (file.size === 0) return "This file is empty.";
  if (file.size > LIMITS[kind].bytes) return `This image is too large. The limit is ${LIMITS[kind].label}.`;
  return null;
}

export function checkDimensions(width: number, height: number): string | null {
  if (width < MIN_SIDE || height < MIN_SIDE) return `This image is too small. Each side must be at least ${MIN_SIDE} pixels.`;
  if (width > MAX_SIDE || height > MAX_SIDE) return `This image is too big. Each side must be at most ${MAX_SIDE} pixels.`;
  return null;
}
