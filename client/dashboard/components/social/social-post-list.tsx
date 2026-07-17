"use client";

import { useDeferredValue, useState } from "react";
import { Button } from "@heroui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SocialPostStatusBadge } from "./social-post-status-badge";

import type {
  SocialPlatform,
  SocialPostFilters,
  SocialPostStatus,
} from "@/types/social";
import { DateTimeText } from "@/components/ui/display";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { FilterDropdown, SearchInput } from "@/components/ui/form-controls";
import { Pagination as SharedPagination } from "@/components/ui/pagination";
import { useSocialPosts } from "@/hooks/api/use-social-posts";
import { usePermissions } from "@/hooks/use-permissions";
import { SOCIAL_PLATFORMS, SOCIAL_POST_STATUSES } from "@/types/social";

const initialFilters: SocialPostFilters = {
  search: "",
  status: "ALL",
  platform: "ALL",
  page: 1,
  limit: 12,
};

export function SocialPostList() {
  const { can } = usePermissions();
  const canRead = can("social_post.read");
  const canCreate = can("social_post.create");
  const [filters, setFilters] = useState(initialFilters);
  const deferredSearch = useDeferredValue(filters.search.trim());
  const queryFilters = { ...filters, search: deferredSearch };
  const postsQuery = useSocialPosts(queryFilters, canRead);
  const update = <Key extends keyof SocialPostFilters>(
    key: Key,
    value: SocialPostFilters[Key],
  ) => setFilters((current) => ({ ...current, [key]: value, page: 1 }));

  if (!canRead) {
    return (
      <div className="rounded-2xl border border-warning/30 bg-warning/10 p-6 text-sm">
        You do not have permission to view social posts.
      </div>
    );
  }

  const router = useRouter();

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">Social commerce</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Social posts
          </h2>
          <p className="mt-2 text-sm text-muted">
            Build shoppable stories and track every publishing destination.
          </p>
        </div>
        {canCreate && (
          <Button
            type="button"
            variant="primary"
            onPress={() => router.push("/dashboard/social-posts/new")}
          >
            Create social post
          </Button>
        )}
      </header>

      <div className="grid gap-3 rounded-2xl border border-separator bg-surface p-4 sm:grid-cols-3">
        <SearchInput
          label="Search social posts"
          placeholder="Search title or content"
          value={filters.search}
          onChange={(value) => update("search", value)}
        />
        <FilterDropdown
          label="Status"
          value={filters.status}
          onChange={(value) =>
            update("status", value as SocialPostStatus | "ALL")
          }
        >
          <option value="ALL">All statuses</option>
          {SOCIAL_POST_STATUSES.map((status) => (
            <option key={status} value={status}>
              {toLabel(status)}
            </option>
          ))}
        </FilterDropdown>
        <FilterDropdown
          label="Platform"
          value={filters.platform}
          onChange={(value) =>
            update("platform", value as SocialPlatform | "ALL")
          }
        >
          <option value="ALL">All platforms</option>
          {SOCIAL_PLATFORMS.map((platform) => (
            <option key={platform} value={platform}>
              {toLabel(platform)}
            </option>
          ))}
        </FilterDropdown>
      </div>

      {postsQuery.isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              className="h-72 animate-pulse rounded-2xl bg-surface-secondary"
              key={index}
            />
          ))}
        </div>
      ) : postsQuery.isError ? (
        <ErrorState
          description={postsQuery.error.message}
          title="Social posts are unavailable"
          onRetry={() => postsQuery.refetch()}
        />
      ) : postsQuery.data.items.length ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {postsQuery.data.items.map((post) => (
              <Link
                className="group overflow-hidden rounded-2xl border border-separator bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
                href={`/dashboard/social-posts/${post.id}`}
                key={post.id}
              >
                <div
                  className="flex h-32 items-end bg-surface-secondary bg-cover bg-center p-4"
                  style={
                    post.mediaUrls[0]
                      ? {
                          backgroundImage: `linear-gradient(180deg, transparent, rgb(0 0 0 / 55%)), url("${post.mediaUrls[0]}")`,
                        }
                      : undefined
                  }
                >
                  <SocialPostStatusBadge status={post.status} />
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-1 font-semibold group-hover:text-accent">
                    {post.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-muted">
                    {post.content}
                  </p>
                  <div className="mt-4 flex min-h-6 flex-wrap gap-1.5">
                    {post.targetPlatforms.length ? (
                      post.targetPlatforms.map((platform) => (
                        <span
                          className="rounded-md bg-accent/8 px-2 py-1 text-[10px] font-semibold text-accent"
                          key={platform}
                        >
                          {toLabel(platform)}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted">
                        No platforms selected
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-separator pt-3 text-xs text-muted">
                    <span>
                      {post.hotspots.length} product
                      {post.hotspots.length === 1 ? "" : "s"}
                    </span>
                    <DateTimeText value={post.updatedAt} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="overflow-hidden rounded-xl border border-separator bg-surface">
            <SharedPagination
              itemLabel="posts"
              meta={postsQuery.data.meta}
              onPageChange={(page) =>
                setFilters((current) => ({ ...current, page }))
              }
            />
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-separator bg-surface">
          <EmptyState
            title="No social posts found"
            description={
              deferredSearch ||
              filters.status !== "ALL" ||
              filters.platform !== "ALL"
                ? "Try changing your search or filters."
                : "Create a shoppable post to start sharing your catalog."
            }
            action={
              canCreate &&
              !deferredSearch &&
              filters.status === "ALL" &&
              filters.platform === "ALL" ? (
                <Button
                  type="button"
                  variant="primary"
                  onPress={() => router.push("/dashboard/social-posts/new")}
                >
                  Create social post
                </Button>
              ) : undefined
            }
          />
        </div>
      )}
    </section>
  );
}

function toLabel(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}
