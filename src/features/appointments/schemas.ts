import { z } from "zod";
import { idSchema } from "@/features/patients/schemas";
import { daysBetween } from "@/lib/calendar";
import { MAX_SLOT_DAYS } from "./options";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.");
const hhmm = z.string().regex(/^\d{2}:\d{2}$/, "Choose a time.");

export const slotQuerySchema = z
  .object({
    practitioner_id: idSchema,
    from: isoDate,
    to: isoDate,
    timezone: z.string().max(64).optional(),
    /** A walk-in may use the slot that is running now. */
    include_running: z.boolean().optional(),
  })
  .refine(
    (v) => {
      const span = daysBetween(v.from, v.to);
      return span !== null && span >= 0 && span < MAX_SLOT_DAYS;
    },
    { path: ["to"], message: `Choose at most ${MAX_SLOT_DAYS} days.` },
  );

export const bookRequestSchema = z.object({
  patient_id: idSchema,
  practitioner_id: idSchema,
  date: isoDate,
  time: hhmm,
  appointment_type: z.enum(["consultation", "follow_up", "procedure"]),
  source: z.enum(["staff", "walk_in"]),
  reason: z.string().trim().max(150, "At most 150 characters."),
});

export const reasonSchema = z.object({
  reason: z.string().trim().min(1, "Enter a reason.").max(150, "At most 150 characters."),
});

/** The reason is optional and kept in the status history only. */
export const rescheduleSchema = z.object({
  date: isoDate,
  time: hhmm,
  reason: z.string().trim().max(100, "At most 100 characters.").optional(),
});
