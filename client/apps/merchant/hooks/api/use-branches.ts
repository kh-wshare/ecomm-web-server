"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@repo/query-client";

import {
  archiveBranch,
  createBranch,
  getBranches,
  updateBranch,
} from "@/lib/branches/branch-data";
import type { BranchValues } from "@/types/branch";

export function useBranches(filters: { status?: string } = {}) {
  return useQuery({
    queryFn: () => getBranches(filters),
    queryKey: queryKeys.branches.list(filters),
  });
}

export function useSaveBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      branchId,
      values,
    }: {
      branchId?: string;
      values: BranchValues;
    }) => (branchId ? updateBranch(branchId, values) : createBranch(values)),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.all }),
  });
}

export function useArchiveBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveBranch,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.all }),
  });
}
