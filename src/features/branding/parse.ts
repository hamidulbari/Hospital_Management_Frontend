import { toLocalSrc } from "@/lib/branding";
import { rec, str } from "@/lib/utils/guards";

export type Branding = {
  hospitalName: string;
  /** Our own address of the logo (not the backend's), or null when none is set. */
  logoSrc: string | null;
  loginImageSrc: string | null;
};

/** GET /branding answers { data: { hospital_name, logo_url, login_image_url } } (schema confirmed). */
export function parseBranding(body: unknown): Branding | null {
  const d = rec(rec(body).data);
  const hospitalName = str(d.hospital_name);
  if (!hospitalName) return null;
  return {
    hospitalName,
    logoSrc: toLocalSrc(str(d.logo_url), "logo"),
    loginImageSrc: toLocalSrc(str(d.login_image_url), "login_image"),
  };
}
