"use client";

import { Pagination as HeroPagination } from "@heroui/react";

import type { PaginationMeta } from "@repo/types";

export function Pagination({
  itemLabel = "items",
  meta,
  onPageChange,
}: {
  itemLabel?: string;
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}) {
  const hasPrev = meta.hasPrev ?? meta.page > 1;
  const hasNext = meta.hasNext ?? meta.page < meta.totalPages;

  return (
    <HeroPagination className="border-t border-separator px-4 py-3">
      <HeroPagination.Summary className="text-xs text-muted">
        {meta.total} total {itemLabel}
      </HeroPagination.Summary>
      <HeroPagination.Content>
        <HeroPagination.Item>
          <HeroPagination.Previous
            isDisabled={!hasPrev}
            onPress={() => onPageChange(meta.page - 1)}
          >
            <HeroPagination.PreviousIcon />
            <span>Previous</span>
          </HeroPagination.Previous>
        </HeroPagination.Item>
        <HeroPagination.Item>
          <HeroPagination.Link isActive>
            {meta.page} / {Math.max(meta.totalPages, 1)}
          </HeroPagination.Link>
        </HeroPagination.Item>
        <HeroPagination.Item>
          <HeroPagination.Next
            isDisabled={!hasNext}
            onPress={() => onPageChange(meta.page + 1)}
          >
            <span>Next</span>
            <HeroPagination.NextIcon />
          </HeroPagination.Next>
        </HeroPagination.Item>
      </HeroPagination.Content>
    </HeroPagination>
  );
}
