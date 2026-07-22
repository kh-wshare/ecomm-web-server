import { z } from "zod";

import {
  PRODUCT_STATUSES,
  SALES_CHANNELS,
  VARIANT_STATUSES,
} from "@/types/product";

const money = /^\d{1,10}(?:\.\d{1,2})?$/;
const sku = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const variantSchema = z.object({
  key: z.string(),
  sku: z
    .string()
    .trim()
    .min(1, "Variant SKU is required")
    .max(80)
    .regex(sku, "Use letters, numbers, periods, underscores, or hyphens"),
  name: z.string().trim().min(1, "Variant name is required").max(120),
  price: z.string().trim().regex(money, "Enter a valid price"),
  attributes: z
    .string()
    .trim()
    .refine(isJsonObject, "Enter a valid JSON object"),
  status: z.enum(VARIANT_STATUSES),
  initialStock: integerString("Variant initial stock"),
  safetyBuffer: integerString("Variant safety buffer"),
  stockAdjustment: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^-?\d+$/.test(value),
      "Enter a whole number",
    ),
});

const mediaSchema = z.object({
  key: z.string(),
  type: z.enum(["IMAGE", "VIDEO"]),
  url: z.url("Enter a complete media URL"),
});

export const productFormSchema = z
  .object({
    name: z.string().trim().min(1, "Product name is required").max(160),
    slug: z
      .string()
      .trim()
      .max(180)
      .refine(
        (value) => !value || slug.test(value),
        "Use a lowercase URL slug",
      ),
    description: z.string().trim().max(10000),
    sku: z
      .string()
      .trim()
      .min(1, "SKU is required")
      .max(80)
      .regex(sku, "Use letters, numbers, periods, underscores, or hyphens"),
    price: z.string().trim().regex(money, "Enter a valid price"),
    currency: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{3}$/, "Enter a three-letter currency code"),
    status: z.enum(PRODUCT_STATUSES),
    categoryId: z.string().trim(),
    variants: z.array(variantSchema).max(100),
    media: z.array(mediaSchema).max(50),
    channels: z.array(
      z.object({
        channel: z.enum(SALES_CHANNELS),
        isVisible: z.boolean(),
        isPurchasable: z.boolean(),
      }),
    ),
    initialStock: integerString("Initial stock"),
    safetyBuffer: integerString("Safety buffer"),
    stockAdjustment: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || /^-?\d+$/.test(value),
        "Enter a whole number",
      ),
  })
  .superRefine((values, context) => {
    values.channels.forEach((item, index) => {
      if (item.isPurchasable && !item.isVisible) {
        context.addIssue({
          code: "custom",
          path: ["channels", index, "isPurchasable"],
          message: "Purchasable channels must also be visible",
        });
      }
    });
  });

function integerString(label: string) {
  return z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^\d+$/.test(value),
      `${label} must be a whole number`,
    );
}

function isJsonObject(value: string) {
  try {
    const parsed: unknown = JSON.parse(value || "{}");

    return (
      typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
    );
  } catch {
    return false;
  }
}
