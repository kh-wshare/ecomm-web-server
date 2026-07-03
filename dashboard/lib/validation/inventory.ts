import { z } from "zod";

export const inventoryAdjustmentSchema = z.object({
  type: z.enum(["STOCK_IN", "STOCK_OUT"]),
  quantity: z
    .string()
    .trim()
    .regex(/^\d+$/, "Enter a whole number")
    .refine((value) => Number(value) > 0, "Quantity must be greater than zero"),
  safetyBuffer: z
    .string()
    .trim()
    .regex(/^\d+$/, "Enter a non-negative whole number"),
  reason: z.string().trim().min(2, "Add a reason").max(120),
});
