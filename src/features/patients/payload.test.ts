import { describe, expect, it } from "vitest";
import { buildRegisterBody, remapConsentFieldErrors } from "./payload";
import type { RegisterFormValues } from "./schemas";

const noConsents = [
  { type: "treatment", granted: false, method: "", given_by: "" },
  { type: "data_sharing", granted: false, method: "", given_by: "" },
  { type: "research", granted: false, method: "", given_by: "" },
];

const base: RegisterFormValues = {
  title: "", first_name: " Asha ", middle_name: "", last_name: "", sex_at_birth: "female",
  date_of_birth: "", estimated_age_years: "", phone: " +919000000000 ", email: "", blood_group: "",
  preferred_language: "", contacts: [], consents: noConsents,
};

describe("buildRegisterBody", () => {
  it("sends only required fields when the rest is empty", () => {
    expect(buildRegisterBody(base, false)).toEqual({ first_name: "Asha", sex_at_birth: "female", phone: "+919000000000" });
  });
  it("converts the estimated age to a number when there is no date of birth", () => {
    expect(buildRegisterBody({ ...base, estimated_age_years: "42" }, false).estimated_age_years).toBe(42);
  });
  it("drops the estimated age when a date of birth is given", () => {
    const body = buildRegisterBody({ ...base, date_of_birth: "2014-07-11", estimated_age_years: "42" }, false);
    expect(body.date_of_birth).toBe("2014-07-11");
    expect("estimated_age_years" in body).toBe(false);
  });
  it("sends only the ticked consents", () => {
    const consents = [
      { type: "treatment", granted: true, method: "paper", given_by: "patient" },
      { type: "data_sharing", granted: false, method: "", given_by: "" },
      { type: "research", granted: true, method: "digital", given_by: "representative" },
    ];
    expect(buildRegisterBody({ ...base, consents }, false).consents).toEqual([
      { type: "treatment", method: "paper", given_by: "patient" },
      { type: "research", method: "digital", given_by: "representative" },
    ]);
  });
  it("sends no consents key when none is ticked", () => {
    expect("consents" in buildRegisterBody(base, false)).toBe(false);
  });
  it("adds the duplicate flag only when asked", () => {
    expect(buildRegisterBody(base, true).acknowledge_duplicates).toBe(true);
    expect("acknowledge_duplicates" in buildRegisterBody(base, false)).toBe(false);
  });
});

describe("remapConsentFieldErrors", () => {
  it("maps the server's index back to the row on screen", () => {
    const consents = [
      { type: "treatment", granted: false, method: "", given_by: "" },
      { type: "data_sharing", granted: false, method: "", given_by: "" },
      { type: "research", granted: true, method: "digital", given_by: "patient" },
    ];
    const mapped = remapConsentFieldErrors({ "consents.0.method": "Bad method.", phone: "Bad phone." }, { ...base, consents });
    expect(mapped).toEqual({ "consents.2.method": "Bad method.", phone: "Bad phone." });
  });
});