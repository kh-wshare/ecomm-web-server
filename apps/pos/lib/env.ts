import { z } from "zod";

const posEnvironmentSchema = z.object({
  INTERNAL_API_URL: z.string().url().optional().transform(optionalStripTrailingSlash),
  NEXT_PUBLIC_API_URL: z
    .string()
    .url()
    .default("http://localhost:3000")
    .transform(stripTrailingSlash),
});

const result = posEnvironmentSchema.safeParse({
  INTERNAL_API_URL: process.env.INTERNAL_API_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});

if (!result.success) {
  throw new Error(`Invalid POS environment: ${z.prettifyError(result.error)}`);
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function optionalStripTrailingSlash(value?: string) {
  return value?.replace(/\/+$/, "");
}

export const env = Object.freeze(result.data);
export type PosEnvironment = z.infer<typeof posEnvironmentSchema>;
