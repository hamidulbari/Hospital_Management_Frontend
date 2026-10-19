import { z } from "zod";
import { VITAL_CODES } from "./options";

const noteBody = z.string().trim().min(1, "Write something first.").max(20000, "At most 20,000 characters.");

export const createNoteSchema = z.object({
  note_type: z.enum(["history", "examination", "progress", "advice", "other"], { message: "Choose a note type." }),
  body: noteBody,
});

export const draftBodySchema = z.object({ body: noteBody });

export const amendSchema = z.object({
  reason: z.string().trim().min(1, "Enter a reason.").max(255, "At most 255 characters."),
  body: z.string().max(20000, "At most 20,000 characters.").optional(),
});

export const vitalsSchema = z.object({
  readings: z
    .array(z.object({ code: z.enum(VITAL_CODES), value: z.number().finite() }))
    .min(1, "Enter at least one reading.")
    .max(VITAL_CODES.length),
});

export const vitalReasonSchema = z.object({
  reason: z.string().trim().min(1, "Enter a reason.").max(150, "At most 150 characters."),
});

export const diagnosisSchema = z.object({
  diagnosis_type: z.enum(["provisional", "differential", "final"], { message: "Choose one." }),
  code_system: z.enum(["icd10", "snomed", "local", "free_text"], { message: "Choose one." }),
  code: z.string().trim().max(20, "At most 20 characters."),
  display: z.string().trim().min(1, "Write the diagnosis in your own words.").max(255, "At most 255 characters."),
});