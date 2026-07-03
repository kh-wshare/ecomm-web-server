export type ApiErrorPayload = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  correlationId?: string;
  errors?: Record<string, string[]>;
};

export class ApiError extends Error {
  readonly status: number;
  readonly correlationId?: string;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    message: string,
    options: {
      status: number;
      correlationId?: string;
      fieldErrors?: Record<string, string[]>;
    },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.correlationId = options.correlationId;
    this.fieldErrors = options.fieldErrors;
  }
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  return "Something went wrong. Please try again.";
}

export function createApiError(status: number, payload: unknown) {
  const body = isApiErrorPayload(payload) ? payload : undefined;
  const message = Array.isArray(body?.message)
    ? body.message.join(", ")
    : (body?.message ?? body?.error ?? `Request failed with status ${status}`);

  return new ApiError(message, {
    status,
    correlationId: body?.correlationId,
    fieldErrors: body?.errors,
  });
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return typeof value === "object" && value !== null;
}
