import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/min";

export const DEFAULT_PHONE_COUNTRY: CountryCode = "IN";

export type CountryEntry = { code: CountryCode; name: string; dial: string };

let cache: CountryEntry[] | null = null;

function regionName(names: Intl.DisplayNames, code: string): string {
  try {
    return names.of(code) ?? code;
  } catch {
    return code;
  }
}

/** All countries, A to Z by name, with the pinned country first. */
export function phoneCountries(pinned: CountryCode = DEFAULT_PHONE_COUNTRY): CountryEntry[] {
  if (!cache) {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    cache = getCountries()
      .map((code) => ({ code, name: regionName(names, code), dial: getCountryCallingCode(code) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  const first = cache.find((c) => c.code === pinned);
  return first ? [first, ...cache.filter((c) => c !== first)] : cache;
}

/** Country + typed digits -> "+919876543210". Empty digits give an empty string. */
export function joinPhone(country: CountryCode, digits: string): string {
  return digits ? `+${getCountryCallingCode(country)}${digits}` : "";
}

/** "+919876543210" -> { country: "IN", digits: "9876543210" }, or null when it cannot be read. */
export function splitPhone(value: string): { country: CountryCode; digits: string } | null {
  const parsed = parsePhoneNumberFromString(value);
  return parsed?.country ? { country: parsed.country, digits: parsed.nationalNumber } : null;
}