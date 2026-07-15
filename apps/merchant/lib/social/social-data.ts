import type {
  HotspotPayload,
  ShoppableHotspot,
  SocialPlatform,
  SocialPost,
  SocialPostFilters,
  SocialPostPage,
  SocialPostPayload,
  SocialPublishLog,
  SocialPublishResult,
} from "@/types/social";
import type { ApiResponse } from "@repo/types";

const commerceBasePath = "/merchant/api/commerce";

export async function getSocialPosts(
  filters: SocialPostFilters,
): Promise<SocialPostPage> {
  const response = await commerceRequest<ApiResponse<SocialPost[]>>(
    `/social-posts?${new URLSearchParams({
      page: String(filters.page),
      limit: String(filters.limit),
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.status !== "ALL" ? { status: filters.status } : {}),
      ...(filters.platform !== "ALL" ? { platform: filters.platform } : {}),
    })}`,
  );

  return {
    items: response.data,
    meta: response.meta ?? {
      limit: filters.limit,
      page: filters.page,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: filters.page > 1,
    },
  };
}

export async function getSocialPost(postId: string) {
  const response = await commerceRequest<ApiResponse<SocialPost>>(
    `/social-posts/${postId}`,
  );

  return response.data;
}

export async function createSocialPost(payload: SocialPostPayload) {
  const response = await commerceRequest<ApiResponse<SocialPost>>(
    "/social-posts",
    {
      body: payload,
      method: "POST",
    },
  );

  return response.data;
}

export async function updateSocialPost(
  postId: string,
  payload: Partial<SocialPostPayload>,
) {
  const response = await commerceRequest<ApiResponse<SocialPost>>(
    `/social-posts/${postId}`,
    {
      body: payload,
      method: "PATCH",
    },
  );

  return response.data;
}

export async function addSocialHotspot(
  postId: string,
  payload: HotspotPayload,
) {
  const response = await commerceRequest<ApiResponse<ShoppableHotspot>>(
    `/social-posts/${postId}/hotspots`,
    {
      body: payload,
      method: "POST",
    },
  );

  return response.data;
}

export async function publishSocialPost(
  postId: string,
  platforms: SocialPlatform[],
) {
  const response = await commerceRequest<ApiResponse<SocialPublishResult>>(
    `/social-posts/${postId}/publish`,
    {
      body: { platforms },
      method: "POST",
    },
  );

  return response.data;
}

export async function getSocialPublishLogs(postId: string) {
  const response = await commerceRequest<ApiResponse<SocialPublishLog[]>>(
    `/social-posts/${postId}/logs`,
  );

  return response.data;
}

async function commerceRequest<T>(
  path: string,
  options: { body?: unknown; method?: string } = {},
) {
  const response = await fetch(`${commerceBasePath}${path}`, {
    body:
      options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body === undefined
        ? {}
        : { "Content-Type": "application/json" }),
    },
    method: options.method ?? "GET",
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "Social post request failed";

    throw new Error(message);
  }

  return payload as T;
}
