import { z } from "zod";

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .string()
    .url()
    .default("http://localhost:3000")
    .transform(stripTrailingSlash),
  NEXT_PUBLIC_DASHBOARD_URL: z
    .string()
    .url()
    .default("http://localhost:3001")
    .transform(stripTrailingSlash),
  NEXT_PUBLIC_STOREFRONT_URL: z
    .string()
    .url()
    .default("http://localhost:3002")
    .transform(stripTrailingSlash),
  NEXT_PUBLIC_WEBSOCKET_URL: z
    .string()
    .url()
    .default("http://localhost:3000")
    .transform(stripTrailingSlash),
});

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

const result = publicEnvironmentSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_DASHBOARD_URL: process.env.NEXT_PUBLIC_DASHBOARD_URL,
  NEXT_PUBLIC_STOREFRONT_URL: process.env.NEXT_PUBLIC_STOREFRONT_URL,
  NEXT_PUBLIC_WEBSOCKET_URL: process.env.NEXT_PUBLIC_WEBSOCKET_URL,
});

if (!result.success) {
  throw new Error(
    `Invalid dashboard environment: ${z.prettifyError(result.error)}`,
  );
}

export const env = Object.freeze(result.data);
export type PublicEnvironment = z.infer<typeof publicEnvironmentSchema>;
