import type { ApiErrorBody, ApiResponse } from "@repo/types";

export class ApiError extends Error {
  status: number;
  statusCode: number;
  code?: string;
  fields?: Record<string, string[]>;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = body.statusCode;
    this.statusCode = body.statusCode;
    this.code = body.code;
    this.fields = body.fields;
  }
}

export type ApiEnvironment = {
  INTERNAL_API_URL?: string;
  NEXT_PUBLIC_API_URL?: string;
};

export type ApiClientOptions = {
  baseUrl: string;
  credentials?: RequestCredentials;
  headers?: HeadersInit;
  timeoutMs?: number;
};

export type ServerApiClientOptions = Omit<ApiClientOptions, "baseUrl"> & {
  baseUrl?: string;
  cookieHeader?: string;
  env?: ApiEnvironment;
};

export type BrowserApiClientOptions = Omit<ApiClientOptions, "baseUrl"> & {
  baseUrl?: string;
  env?: ApiEnvironment;
};

export function createApiClient(options: ApiClientOptions) {
  const baseUrl = stripTrailingSlash(options.baseUrl);

  async function request<TResponse, TBody = unknown>(
    method: string,
    path: string,
    body?: TBody,
    init?: RequestInit,
  ): Promise<TResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? 15000,
    );

    try {
      const isFormData = body instanceof FormData;
      const response = await fetch(`${baseUrl}/${path.replace(/^\/+/, "")}`, {
        ...init,
        method,
        body: body !== undefined
          ? isFormData
            ? (body as BodyInit)
            : JSON.stringify(body)
          : undefined,
        headers: {
          ...(isFormData ? {} : { "content-type": "application/json" }),
          ...options.headers,
          ...init?.headers,
        },
        credentials: options.credentials ?? init?.credentials ?? "include",
        signal: init?.signal ?? controller.signal,
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({
          statusCode: response.status,
          message: response.statusText,
        }))) as ApiErrorBody;

        throw new ApiError(errorBody);
      }

      if (response.status === 204) {
        return undefined as TResponse;
      }

      return (await response.json()) as TResponse;
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    delete: <TResponse>(path: string, init?: RequestInit) =>
      request<TResponse>("DELETE", path, undefined, init),
    get: <TResponse>(path: string, init?: RequestInit) =>
      request<TResponse>("GET", path, undefined, init),
    patch: <TResponse, TBody>(path: string, body: TBody, init?: RequestInit) =>
      request<TResponse, TBody>("PATCH", path, body, init),
    post: <TResponse, TBody>(path: string, body: TBody, init?: RequestInit) =>
      request<TResponse, TBody>("POST", path, body, init),
    put: <TResponse, TBody>(path: string, body: TBody, init?: RequestInit) =>
      request<TResponse, TBody>("PUT", path, body, init),
  };
}

export function createBrowserApiClient(options: BrowserApiClientOptions = {}) {
  return createApiClient({
    ...options,
    baseUrl:
      options.baseUrl ??
      resolveApiBaseUrl("browser", options.env ?? readRuntimeEnv()),
  });
}

export function createServerApiClient(options: ServerApiClientOptions = {}) {
  return createApiClient({
    ...options,
    baseUrl:
      options.baseUrl ??
      resolveApiBaseUrl("server", options.env ?? readRuntimeEnv()),
    headers: {
      ...(options.cookieHeader ? { cookie: options.cookieHeader } : {}),
      ...options.headers,
    },
  });
}

export function resolveApiBaseUrl(
  runtime: "browser" | "server",
  env: ApiEnvironment,
) {
  const url =
    runtime === "server"
      ? env.INTERNAL_API_URL || env.NEXT_PUBLIC_API_URL
      : env.NEXT_PUBLIC_API_URL;

  if (!url) {
    throw new Error(
      runtime === "server"
        ? "Missing INTERNAL_API_URL or NEXT_PUBLIC_API_URL"
        : "Missing NEXT_PUBLIC_API_URL",
    );
  }

  return stripTrailingSlash(url);
}

export type ResourceClient = ReturnType<typeof createResourceClient>;

export function createResourceClient(basePath: string, client: ApiClient) {
  return {
    create: <TResponse, TBody>(body: TBody, init?: RequestInit) =>
      client.post<TResponse, TBody>(basePath, body, init),
    delete: <TResponse>(id: string, init?: RequestInit) =>
      client.delete<TResponse>(`${basePath}/${id}`, init),
    detail: <TResponse>(id: string, init?: RequestInit) =>
      client.get<TResponse>(`${basePath}/${id}`, init),
    list: <TResponse>(query?: QueryParams, init?: RequestInit) =>
      client.get<TResponse>(withQuery(basePath, query), init),
    update: <TResponse, TBody>(id: string, body: TBody, init?: RequestInit) =>
      client.patch<TResponse, TBody>(`${basePath}/${id}`, body, init),
  };
}

export function createCommerceApiServices(client: ApiClient) {
  return {
    checkout: createResourceClient("/checkout", client),
    inventory: createResourceClient("/inventory", client),
    orders: createResourceClient("/orders", client),
    payments: createResourceClient("/payments", client),
    products: createResourceClient("/products", client),
    social: createResourceClient("/social-posts", client),
    storefront: createResourceClient("/storefront", client),
    theme: createResourceClient("/theme", client),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
export type QueryParams = Record<
  string,
  boolean | null | number | string | undefined
>;

export function unwrapApiResponseData<TResponse>(payload: unknown): TResponse {
  return isApiSuccessEnvelope<TResponse>(payload)
    ? payload.data
    : (payload as TResponse);
}

export function isApiSuccessEnvelope<TResponse>(
  payload: unknown,
): payload is ApiResponse<TResponse> {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      "data" in payload &&
      "message" in payload &&
      "path" in payload &&
      "statusCode" in payload &&
      "timestamp" in payload,
  );
}

function withQuery(path: string, query?: QueryParams) {
  if (!query) return path;

  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();

  return queryString ? `${path}?${queryString}` : path;
}

function readRuntimeEnv(): ApiEnvironment {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: ApiEnvironment };
  };

  return runtime.process?.env ?? {};
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}
