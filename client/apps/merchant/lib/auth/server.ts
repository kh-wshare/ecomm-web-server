import { NextResponse } from "next/server";

import { unwrapApiResponseData } from "@repo/api-client";

import {
  getInternalApiUrl,
  missingInternalApiResponse,
} from "@/lib/api/server";

type RequestOptions = {
  accessToken?: string;
  body?: unknown;
  method?: string;
};

export async function requestAuthApi<T>(
  path: string,
  { accessToken, body, method = "POST" }: RequestOptions = {},
) {
  const apiBaseUrl = getInternalApiUrl();
  if (!apiBaseUrl) return missingInternalApiResponse();

  const response = await fetch(`${apiBaseUrl}${path}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    method,
  });

  const payload = await parsePayload(response);
  if (!response.ok) {
    return NextResponse.json(normalizeError(payload, response), {
      status: response.status,
    });
  }

  return unwrapApiResponseData<T>(payload);
}

function parsePayload(response: Response) {
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) return response.json();
  return response.text();
}

function normalizeError(payload: unknown, response: Response) {
  if (payload && typeof payload === "object") return payload;

  return {
    message:
      typeof payload === "string" && payload
        ? payload
        : response.statusText || "Request failed",
    statusCode: response.status,
  };
}
