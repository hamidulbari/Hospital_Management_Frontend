import { isPossiblePhoneNumber } from "libphonenumber-js/min";
import { z } from "zod";
import { MAX_CONTACTS } from "./limits";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// The date field gives "YYYY-MM-DD", or the raw typed text while it is not a real date.
const optionalDate = z
  .string()
  .trim()
  .refine((v) => v === "" || DATE_RE.test(v), "Enter a valid date as DD/MM/YYYY.");

// The phone field gives "+<country code><digits>". Only the length is checked here: the server decides the rest.
const requiredPhone = z
  .string()
  .trim()
  .min(1, "Enter the phone number.")
  .max(20)
  .refine((v) => isPossiblePhoneNumber(v), "Enter a valid phone number.");

// ---- search ----
const searchFields = z.object({
  name: z.string().trim().max(100),
  phone: z.string().trim().max(20),
  mrn: z.string().trim().max(30),
  date_of_birth: optionalDate,
});
const hasSearchTerm = (v: { name: string; phone: string; mrn: string }) => v.name !== "" || v.phone !== "" || v.mrn !== "";
const searchTermIssue = { path: ["name"], message: "Enter a name, phone number or MRN." };

export const searchFormSchema = searchFields.refine(hasSearchTerm, searchTermIssue);
export type SearchFormValues = z.infer<typeof searchFormSchema>;

export const searchRequestSchema = searchFields
  .extend({ page: z.number().int().min(1).max(100000) })
  .refine(hasSearchTerm, searchTermIssue);

// ---- register ----
const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter the name.").max(150),
  relationship: z.string().trim().min(1, "Enter the relationship.").max(50),
  phone: requiredPhone,
  is_emergency: z.boolean(),
  is_authorized_representative: z.boolean(),
});

// One row per consent type. Method and "given by" are only needed when the consent is ticked.
const consentDraftSchema = z
  .object({
    type: z.string(),
    granted: z.boolean(),
    method: z.string(),
    given_by: z.string(),
  })
  .superRefine((consent, ctx) => {
    if (!consent.granted) return;
    if (!consent.method) ctx.addIssue({ code: "custom", path: ["method"], message: "Choose one." });
    if (!consent.given_by) ctx.addIssue({ code: "custom", path: ["given_by"], message: "Choose one." });
  });

export const registerFormSchema = z.object({
  title: z.string().trim().max(20),
  first_name: z.string().trim().min(1, "Enter the first name.").max(100),
  middle_name: z.string().trim().max(100),
  last_name: z.string().trim().max(100),
  sex_at_birth: z.string().min(1, "Choose one."),
  date_of_birth: optionalDate,
  estimated_age_years: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d{1,3}$/.test(v) && Number(v) <= 130), "Enter a whole number from 0 to 130."),
  phone: requiredPhone,
  email: z
    .string()
    .trim()
    .max(190)
    .refine((v) => v === "" || /^\S+@\S+\.\S+$/.test(v), "Enter a valid email address."),
  blood_group: z.string(),
  preferred_language: z.string().trim().max(10),
  contacts: z.array(contactSchema).max(MAX_CONTACTS, `You can add up to ${MAX_CONTACTS} contacts.`),
  consents: z.array(consentDraftSchema),
});
export type RegisterFormValues = z.infer<typeof registerFormSchema>;

// ---- consent (on an existing patient) ----
export const consentFormSchema = z.object({
  type: z.string().min(1, "Choose one."),
  method: z.string().min(1, "Choose one."),
  given_by: z.string().min(1, "Choose one."),
});
export type ConsentFormValues = z.infer<typeof consentFormSchema>;

export const idSchema = z.string().regex(/^[0-9a-z]{26}$/i);