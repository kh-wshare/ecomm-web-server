import type { PaginationMeta } from "@repo/types";

export const SOCIAL_PLATFORMS = [
  "WEBSITE",
  "FACEBOOK",
  "INSTAGRAM",
  "TIKTOK",
] as const;

export const SOCIAL_POST_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "PARTIALLY_PUBLISHED",
  "FAILED",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
export type SocialPostStatus = (typeof SOCIAL_POST_STATUSES)[number];
export type SocialPublishStatus = "PUBLISHED" | "FAILED";

export type SocialPublishLog = {
  id: string;
  socialPostId: string;
  platform: SocialPlatform;
  status: SocialPublishStatus;
  externalPostId: string | null;
  externalUrl: string | null;
  error: string | null;
  createdAt: string;
};

export type ShoppableHotspot = {
  id: string;
  productId: string;
  variantId: string | null;
  xPercent: string;
  yPercent: string;
  label: string | null;
  createdAt?: string;
  product?: {
    id: string;
    name: string;
    slug: string;
    status?: string;
  };
  variant?: {
    id: string;
    name: string;
    status?: string;
  } | null;
};

export type SocialPost = {
  id: string;
  merchantId: string;
  title: string;
  slug: string;
  content: string;
  mediaUrls: string[];
  status: SocialPostStatus;
  targetPlatforms: SocialPlatform[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  hotspots: ShoppableHotspot[];
  publishLogs?: SocialPublishLog[];
  websiteArticle?: {
    id: string;
    slug: string;
    publishedAt: string;
  } | null;
};

export type SocialPostFilters = {
  search: string;
  status: SocialPostStatus | "ALL";
  platform: SocialPlatform | "ALL";
  page: number;
  limit: number;
};

export type SocialPostPage = {
  items: SocialPost[];
  meta: PaginationMeta;
};

export type SocialPostPayload = {
  title: string;
  slug?: string;
  content: string;
  mediaUrls?: string[];
};

export type HotspotPayload = {
  productId: string;
  variantId?: string;
  xPercent: number;
  yPercent: number;
  label?: string;
};

export type PublishResult = SocialPublishLog & {
  skipped: boolean;
};

export type SocialPublishResult = {
  post: SocialPost;
  results: PublishResult[];
};
