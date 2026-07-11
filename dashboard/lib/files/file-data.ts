import { env } from "@/config/env";
import { authTokenStorage } from "@/lib/auth/token-storage";
import { createApiError } from "@/lib/errors/api-error";

export type UploadedFile = {
  bucket?: string;
  contentType: string;
  key: string;
  originalName: string;
  provider: string;
  size: number;
  url: string;
};

export async function uploadMerchantFile(
  file: File,
  options: { purpose?: string; visibility?: "public" | "private" } = {},
) {
  const form = new FormData();
  form.set("file", file);
  form.set("purpose", options.purpose ?? "media");
  form.set("visibility", options.visibility ?? "public");

  const headers = new Headers({ Accept: "application/json" });
  const token = authTokenStorage.getAccessToken();
  const merchantId = authTokenStorage.getMerchantId();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (merchantId) headers.set("X-Merchant-ID", merchantId);

  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/files/upload`, {
    body: form,
    credentials: "include",
    headers,
    method: "POST",
  });
  const payload = await parseResponse(response);

  if (!response.ok) {
    throw createApiError(response.status, payload);
  }

  return (payload as { data: UploadedFile }).data;
}

async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");
  if (!contentType?.includes("application/json")) return response.text();

  return response.json() as Promise<unknown>;
}
