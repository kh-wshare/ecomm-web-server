import { z } from "zod";

const merchantEnvironmentSchema = z.object({
  INTERNAL_API_URL: z
    .string()
    .url()
    .default("http://localhost:9001")
    .transform(stripTrailingSlash),
  NEXT_PUBLIC_API_URL: z
    .string()
    .url()
    .default("http://localhost:9001")
    .transform(stripTrailingSlash),
  NEXT_PUBLIC_DASHBOARD_URL: z
    .string()
    .url()
    .default("http://localhost:3000/merchant")
    .transform(stripTrailingSlash),
  NEXT_PUBLIC_WEBSOCKET_URL: z
    .string()
    .url()
    .default("http://localhost:9001")
    .transform(stripTrailingSlash),
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  NEXT_PUBLIC_TELEGRAM_CLIENT_ID: z.string().optional(),
  NEXT_PUBLIC_TELEGRAM_REDIRECT_URI: z.string().url().optional(),
});

const result = merchantEnvironmentSchema.safeParse({
  INTERNAL_API_URL: process.env.INTERNAL_API_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_DASHBOARD_URL: process.env.NEXT_PUBLIC_DASHBOARD_URL,
  NEXT_PUBLIC_WEBSOCKET_URL: process.env.NEXT_PUBLIC_WEBSOCKET_URL,
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_TELEGRAM_CLIENT_ID: process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID,
  NEXT_PUBLIC_TELEGRAM_REDIRECT_URI:
    process.env.NEXT_PUBLIC_TELEGRAM_REDIRECT_URI,
});

if (!result.success) {
  throw new Error(
    `Invalid merchant environment: ${z.prettifyError(result.error)}`,
  );
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export const env = Object.freeze(result.data);
export type MerchantEnvironment = z.infer<typeof merchantEnvironmentSchema>;
