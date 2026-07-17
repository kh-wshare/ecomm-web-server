import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

const POS_BASE_PATH = "/pos";

type ApiErrorOptions = {
  code?: string;
  fields?: Record<string, string[]>;
  message: string;
  statusCode: number;
};

export function posApiSuccess<TData>(
  request: Request,
  data: TData,
  init: { message?: string; status?: number } = {},
) {
  const status = init.status ?? 200;

  return NextResponse.json(
    {
      statusCode: status,
      message: init.message ?? "Success",
      data,
      timestamp: new Date().toISOString(),
      path: requestPath(request),
      correlationId: correlationId(request),
    },
    { status },
  );
}

export function posApiError(request: Request, options: ApiErrorOptions) {
  return NextResponse.json(
    {
      statusCode: options.statusCode,
      code: options.code,
      message: options.message,
      fields: options.fields,
      timestamp: new Date().toISOString(),
      path: requestPath(request),
      correlationId: correlationId(request),
    },
    { status: options.statusCode },
  );
}

export function proxyApiError(payload: unknown, request: Request, status: number) {
  if (payload && typeof payload === "object") {
    return NextResponse.json(payload, { status });
  }

  return posApiError(request, {
    message: typeof payload === "string" && payload ? payload : "Request failed",
    statusCode: status,
  });
}

export async function parseApiPayload(response: Response) {
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) return response.json();
  return response.text();
}

function requestPath(request: Request) {
  const pathname = new URL(request.url).pathname;
  return pathname.startsWith(POS_BASE_PATH)
    ? pathname
    : `${POS_BASE_PATH}${pathname}`;
}

function correlationId(request: Request) {
  return request.headers.get("x-correlation-id") ?? randomUUID();
}
