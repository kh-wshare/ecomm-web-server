"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  HotspotPayload,
  SocialPlatform,
  SocialPostFilters,
  SocialPostPayload,
} from "@/types/social";
import {
  addSocialHotspot,
  createSocialPost,
  getSocialPost,
  getSocialPosts,
  publishSocialPost,
  updateSocialPost,
} from "@/lib/social/social-data";
import { queryKeys } from "@repo/query-client";

export function useSocialPosts(filters: SocialPostFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.socialPosts.list(filters),
    queryFn: () => getSocialPosts(filters),
    enabled,
  });
}

export function useSocialPost(postId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.socialPosts.detail(postId),
    queryFn: () => getSocialPost(postId),
    enabled: enabled && Boolean(postId),
  });
}

export function useCreateSocialPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SocialPostPayload) => createSocialPost(payload),
    onSuccess: (post) => {
      queryClient.setQueryData(queryKeys.socialPosts.detail(post.id), post);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.socialPosts.all,
      });
    },
  });
}

export function useUpdateSocialPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload,
      postId,
    }: {
      payload: Partial<SocialPostPayload>;
      postId: string;
    }) => updateSocialPost(postId, payload),
    onSuccess: (post) => {
      queryClient.setQueryData(queryKeys.socialPosts.detail(post.id), post);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.socialPosts.all,
      });
    },
  });
}

export function usePublishSocialPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      platforms,
      postId,
    }: {
      platforms: SocialPlatform[];
      postId: string;
    }) => publishSocialPost(postId, platforms),
    onSuccess: (result) => {
      queryClient.setQueryData(
        queryKeys.socialPosts.detail(result.post.id),
        result.post,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.socialPosts.all,
      });
    },
  });
}

export function useAddHotspot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload,
      postId,
    }: {
      payload: HotspotPayload;
      postId: string;
    }) => addSocialHotspot(postId, payload),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.socialPosts.detail(variables.postId),
      });
    },
  });
}
