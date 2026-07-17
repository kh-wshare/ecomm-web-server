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
import { apiClient } from "@/lib/api/client";

export async function getSocialPosts(
  filters: SocialPostFilters,
): Promise<SocialPostPage> {
  const response = await apiClient.get<SocialPost[]>(
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
  const response = await apiClient.get<SocialPost>(`/social-posts/${postId}`);

  return response.data;
}

export async function createSocialPost(payload: SocialPostPayload) {
  const response = await apiClient.post<SocialPost>("/social-posts", payload);

  return response.data;
}

export async function updateSocialPost(
  postId: string,
  payload: Partial<SocialPostPayload>,
) {
  const response = await apiClient.patch<SocialPost>(
    `/social-posts/${postId}`,
    payload,
  );

  return response.data;
}

export async function addSocialHotspot(
  postId: string,
  payload: HotspotPayload,
) {
  const response = await apiClient.post<ShoppableHotspot>(
    `/social-posts/${postId}/hotspots`,
    payload,
  );

  return response.data;
}

export async function publishSocialPost(
  postId: string,
  platforms: SocialPlatform[],
) {
  const response = await apiClient.post<SocialPublishResult>(
    `/social-posts/${postId}/publish`,
    { platforms },
  );

  return response.data;
}

export async function getSocialPublishLogs(postId: string) {
  const response = await apiClient.get<SocialPublishLog[]>(
    `/social-posts/${postId}/logs`,
  );

  return response.data;
}
