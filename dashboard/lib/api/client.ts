import { env } from "@/config/env";
import { authTokenStorage } from "@/lib/auth/token-storage";
import { createApiError } from "@/lib/errors/api-error";

export type PaginationMeta = {
  limit: number;
  page: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type ApiResponse<T> = {
  statusCode: number;
  message: string;
  data: T;
  meta?: PaginationMeta;
  timestamp: string;
  path: string;
  correlationId?: string;
};

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  authenticated?: boolean;
  merchantId?: string | null;
};

class ApiClient {
  constructor(private readonly baseUrl: string) {}

  get<T>(path: string, options?: ApiRequestOptions) {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  post<T>(path: string, body?: unknown, options?: ApiRequestOptions) {
    return this.request<T>(path, { ...options, body, method: "POST" });
  }

  patch<T>(path: string, body?: unknown, options?: ApiRequestOptions) {
    return this.request<T>(path, { ...options, body, method: "PATCH" });
  }

  delete<T>(path: string, options?: ApiRequestOptions) {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }

  async request<T>(path: string, options: ApiRequestOptions = {}) {
    const {
      authenticated = true,
      body,
      headers: providedHeaders,
      merchantId = authTokenStorage.getMerchantId(),
      ...requestInit
    } = options;
    const headers = new Headers(providedHeaders);
    const token = authenticated ? authTokenStorage.getAccessToken() : null;

    headers.set("Accept", "application/json");
    if (body !== undefined) headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (merchantId) headers.set("X-Merchant-ID", merchantId);

    const response = await fetch(this.url(path), {
      ...requestInit,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "include",
      headers,
    });
    const payload = await parseResponse(response);

    if (!response.ok) {
      if (authenticated && response.status === 401) authTokenStorage.clear();
      throw createApiError(response.status, payload);
    }

    return payload as ApiResponse<T>;
  }

  private url(path: string) {
    return `${this.baseUrl}/${path.replace(/^\/+/, "")}`;
  }
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type");
  if (!contentType?.includes("application/json")) return response.text();

  return response.json() as Promise<unknown>;
}

export const apiClient = new ApiClient(env.NEXT_PUBLIC_API_URL);
