import { Pagination as HeroPagination } from "@heroui/react";

import type { PaginationMeta } from "@/lib/api/client";

export function Pagination({
  itemLabel = "items",
  meta,
  onPageChange,
}: {
  itemLabel?: string;
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}) {
  return (
    <HeroPagination className="border-t border-separator px-4 py-3">
      <HeroPagination.Summary className="text-xs text-muted">
        {meta.total} total {itemLabel}
      </HeroPagination.Summary>
      <HeroPagination.Content>
        <HeroPagination.Item>
          <HeroPagination.Previous
            isDisabled={!meta.hasPrev}
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
            isDisabled={!meta.hasNext}
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
