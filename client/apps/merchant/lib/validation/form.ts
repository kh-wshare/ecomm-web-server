import type { ZodType } from "zod";

export type FormValidationResult<T> =
  | { success: true; data: T; errors: Record<string, never> }
  | { success: false; data?: never; errors: Record<string, string[]> };

export function validateForm<T>(
  schema: ZodType<T>,
  values: unknown,
): FormValidationResult<T> {
  const result = schema.safeParse(values);

  if (result.success) return { success: true, data: result.data, errors: {} };

  const errors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const field = issue.path.join(".") || "_form";
    errors[field] = [...(errors[field] ?? []), issue.message];
  }

  return { success: false, errors };
}
