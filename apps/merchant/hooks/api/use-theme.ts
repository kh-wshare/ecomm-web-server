"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ThemeConfig } from "@/types/theme";
import {
  getCurrentTheme,
  publishTheme,
  resetThemeDraft,
  saveThemeDraft,
} from "@/lib/theme/theme-data";
import { queryKeys } from "@repo/query-client";

export function useThemeConfig(enabled = true) {
  return useQuery({
    queryKey: queryKeys.theme.current(),
    queryFn: getCurrentTheme,
    enabled,
  });
}

export function useSaveDraftTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      config,
      customDomain,
    }: {
      config: ThemeConfig;
      customDomain?: string | null;
    }) => saveThemeDraft(config, customDomain),
    onSuccess: (theme) => {
      queryClient.setQueryData(queryKeys.theme.current(), theme);
      void queryClient.invalidateQueries({ queryKey: queryKeys.theme.all });
    },
  });
}

export function usePublishTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: publishTheme,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.theme.all }),
  });
}

export function useResetTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resetThemeDraft,
    onSuccess: (theme) => {
      queryClient.setQueryData(queryKeys.theme.current(), theme);
      void queryClient.invalidateQueries({ queryKey: queryKeys.theme.all });
    },
  });
}
