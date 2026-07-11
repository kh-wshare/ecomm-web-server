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
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().default(""),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().default(""),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().default(""),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().default(""),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().default(""),
  NEXT_PUBLIC_TELEGRAM_CLIENT_ID: z.string().default(""),
  NEXT_PUBLIC_TELEGRAM_REDIRECT_URI: z
    .string()
    .default("")
    .refine((value) => !value || URL.canParse(value), {
      message: "Invalid URL",
    }),
});

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

const result = publicEnvironmentSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_DASHBOARD_URL: process.env.NEXT_PUBLIC_DASHBOARD_URL,
  NEXT_PUBLIC_STOREFRONT_URL: process.env.NEXT_PUBLIC_STOREFRONT_URL,
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
    `Invalid dashboard environment: ${z.prettifyError(result.error)}`,
  );
}

export const env = Object.freeze(result.data);
export type PublicEnvironment = z.infer<typeof publicEnvironmentSchema>;
