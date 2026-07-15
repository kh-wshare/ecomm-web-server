import { ApiError } from "@repo/api-client";

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  return "Something went wrong. Please try again.";
}
