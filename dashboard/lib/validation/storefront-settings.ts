import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || z.url().safeParse(value).success,
    "Enter a complete URL",
  );

export const storefrontSettingsSchema = z.object({
  name: z.string().trim().min(1, "Store name is required").max(120),
  slug: z
    .string()
    .trim()
    .min(1, "Store slug is required")
    .max(120)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and hyphens",
    ),
  customDomain: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/.test(
          value,
        ),
      "Enter a valid hostname without https://",
    ),
  seoTitle: z.string().trim().max(70),
  seoDescription: z.string().trim().max(160),
  logoUrl: optionalUrl,
  faviconUrl: optionalUrl,
});
