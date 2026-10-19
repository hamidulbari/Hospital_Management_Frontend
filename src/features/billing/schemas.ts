import { z } from "zod";
import { idSchema } from "@/features/patients/schemas";

const money = z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter an amount with at most two decimals.");
const positiveMoney = money.refine((v) => !/^0+(\.0+)?$/.test(v), "Enter an amount greater than zero.");
const category = z.enum(["consultation", "procedure", "investigation", "bed", "other"], { message: "Choose a category." });

export const apiLineSchema = z.object({
  service_id: idSchema.optional(),
  description: z.string().trim().min(1).max(200).optional(),
  quantity: z.number().int().min(1).max(9999),
  unit_price: money.optional(),
  discount_amount: money.optional(),
  tax_percent: z.number().min(0).max(100).optional(),
});

export const linesSchema = z.object({ lines: z.array(apiLineSchema).min(1, "Add at least one line.").max(100) });
export const createInvoiceSchema = linesSchema.extend({ patient_id: idSchema });

export const reasonSchema = z.object({
  reason: z.string().trim().min(1, "Enter a reason.").max(150, "At most 150 characters."),
});

export const idempotencyKeySchema = z.string().min(8).max(120).regex(/^[A-Za-z0-9._-]+$/);

export const paymentSchema = z
  .object({
    amount: positiveMoney,
    method: z.enum(["cash", "card", "upi", "bank_transfer", "cheque", "other"], { message: "Choose a method." }),
    reference: z.string().trim().max(100, "At most 100 characters."),
  })
  .superRefine((payment, ctx) => {
    if (["card", "upi", "bank_transfer", "cheque"].includes(payment.method) && !payment.reference) {
      ctx.addIssue({ code: "custom", path: ["reference"], message: "Enter the reference (for example the card, UPI or cheque number)." });
    }
  });

export const serviceCreateSchema = z.object({
  code: z.string().trim().min(1, "Enter a code.").max(30, "At most 30 characters."),
  name: z.string().trim().min(1, "Enter a name.").max(200, "At most 200 characters."),
  category,
  unit_price: money,
  tax_percent: z.string().trim().regex(/^(\d+(\.\d{1,2})?)?$/, "Enter a percentage like 5 or 12.5."),
});

export const serviceUpdateSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(200, "At most 200 characters."),
  category,
  unit_price: money,
  tax_percent: z.string().trim().regex(/^(\d+(\.\d{1,2})?)?$/, "Enter a percentage like 5 or 12.5."),
  is_active: z.boolean(),
});