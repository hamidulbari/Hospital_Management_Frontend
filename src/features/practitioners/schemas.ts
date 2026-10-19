import { z } from "zod";
import { idSchema } from "@/features/patients/schemas";
import { isValidTime } from "@/lib/time-input";

const TYPES = ["doctor", "nurse", "technician", "therapist", "pharmacist", "other"] as const;
const STATUSES = ["active", "on_leave", "suspended", "left"] as const;
const CREDENTIAL_TYPES = ["medical_council_registration", "nursing_council_registration", "pharmacy_registration", "other"] as const;

const optionalId = z.string().refine((v) => v === "" || idSchema.safeParse(v).success, "Choose from the list.");
const optionalDate = z.string().trim().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Enter a valid date as DD/MM/YYYY.");
const time = z.string().refine(isValidTime, "Enter a time like 09:00.");
const optionalTime = z.string().refine((v) => v === "" || isValidTime(v), "Enter a time like 09:00.");

export const practitionerCreateSchema = z.object({
  full_name: z.string().trim().min(1, "Enter the name.").max(200, "At most 200 characters."),
  practitioner_type: z.enum(TYPES, { message: "Choose a type." }),
  primary_department_id: optionalId,
  user_id: optionalId,
  joined_on: optionalDate,
});

export const practitionerUpdateSchema = z.object({
  full_name: z.string().trim().min(1, "Enter the name.").max(200, "At most 200 characters."),
  status: z.enum(STATUSES, { message: "Choose a status." }),
  /** Left out when the user may not list departments. "" clears it. */
  primary_department_id: optionalId.optional(),
  joined_on: optionalDate,
  left_on: optionalDate,
});

export const rulesSchema = z
  .object({
    weekdays: z.array(z.number().int().min(1).max(7)).min(1, "Choose at least one day.").max(7),
    start_time: time,
    end_time: time,
    slot_minutes: z.number({ message: "Enter whole minutes from 5 to 240." }).int("Enter whole minutes from 5 to 240.").min(5, "At least 5 minutes.").max(240, "At most 240 minutes."),
    valid_from: optionalDate,
    valid_until: optionalDate,
  })
  .superRefine((rule, ctx) => {
    if (isValidTime(rule.start_time) && isValidTime(rule.end_time) && rule.end_time <= rule.start_time) {
      ctx.addIssue({ code: "custom", path: ["end_time"], message: "The end time must be after the start time." });
    }
    if (rule.valid_from && rule.valid_until && rule.valid_until < rule.valid_from) {
      ctx.addIssue({ code: "custom", path: ["valid_until"], message: "This date must not be before the start date." });
    }
  });

export const exceptionSchema = z
  .object({
    exception_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date as DD/MM/YYYY."),
    kind: z.enum(["blocked", "extra"], { message: "Choose one." }),
    start_time: optionalTime,
    end_time: optionalTime,
    reason: z.string().trim().max(150, "At most 150 characters."),
  })
  .superRefine((e, ctx) => {
    const hasStart = e.start_time !== "";
    const hasEnd = e.end_time !== "";
    if (e.kind === "extra" && !(hasStart && hasEnd)) {
      ctx.addIssue({ code: "custom", path: ["start_time"], message: "Extra hours need a start and an end time." });
    } else if (hasStart !== hasEnd) {
      ctx.addIssue({ code: "custom", path: ["end_time"], message: "Enter both times, or neither for the whole day." });
    }
    if (hasStart && hasEnd && e.end_time <= e.start_time) {
      ctx.addIssue({ code: "custom", path: ["end_time"], message: "The end time must be after the start time." });
    }
  });

export const credentialSchema = z.object({
  credential_type: z.enum(CREDENTIAL_TYPES, { message: "Choose a type." }),
  registration_number: z.string().trim().min(1, "Enter the registration number.").max(100),
  issuing_body: z.string().trim().min(1, "Enter who issued it.").max(150, "At most 150 characters."),
  issued_on: optionalDate,
  expires_on: optionalDate,
});

export const verifySchema = z.object({ outcome: z.enum(["verified", "rejected"]) });

export const specializationsSchema = z
  .object({ specializations: z.array(z.object({ id: idSchema, is_primary: z.boolean() })).max(50) })
  .superRefine((value, ctx) => {
    if (value.specializations.filter((s) => s.is_primary).length > 1) {
      ctx.addIssue({ code: "custom", path: ["specializations"], message: "Only one specialization can be primary." });
    }
  });

export const newSpecializationSchema = z.object({
  code: z.string().trim().min(1, "Enter a code.").max(30, "At most 30 characters."),
  name: z.string().trim().min(1, "Enter a name.").max(150, "At most 150 characters."),
});