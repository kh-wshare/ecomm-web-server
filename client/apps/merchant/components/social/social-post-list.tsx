'use client';

import { type ReactNode, useDeferredValue, useState } from 'react';
import {
  Button,
  EmptyState as HeroEmptyState,
  Pagination,
  Table,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { SocialPostStatusBadge } from './social-post-status-badge';

import type {
  SocialPlatform,
  SocialPostFilters,
  SocialPostStatus,
} from '@/types/social';
import { DateTimeText } from '@repo/ui';
import { Input, Select } from '@/components/products/product-controls';
import { useSocialPosts } from '@/hooks/api/use-social-posts';
import { usePermissions } from '@/hooks/use-permissions';
import { SOCIAL_PLATFORMS, SOCIAL_POST_STATUSES } from '@/types/social';

const initialFilters: SocialPostFilters = {
  search: '',
  status: 'ALL',
  platform: 'ALL',
  page: 1,
  limit: 12,
};

export function SocialPostList() {
  const router = useRouter();
  const { can } = usePermissions();
  const canRead = can('social.manage');
  const canCreate = can('social.manage');
  const [filters, setFilters] = useState(initialFilters);
  const deferredSearch = useDeferredValue(filters.search.trim());
  const queryFilters = { ...filters, search: deferredSearch };
  const postsQuery = useSocialPosts(queryFilters, canRead);
  const posts = postsQuery.data?.items ?? [];
  const postMeta = postsQuery.data?.meta;
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
            onPress={() => router.push('/social-posts/new')}
          >
            Create social post
          </Button>
        )}
      </header>

      <div className="grid gap-3 rounded-2xl border border-separator bg-surface p-4 sm:grid-cols-3">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium">Search social posts</span>
          <Input
            variant="secondary"
            placeholder="Search title or content"
            value={filters.search}
            onChange={(event) => update('search', event.target.value)}
          />
        </label>
        <Select
          label="Status"
          value={filters.status}
          onChange={(event) =>
            update('status', event.target.value as SocialPostStatus | 'ALL')
          }
        >
          <option value="ALL">All statuses</option>
          {SOCIAL_POST_STATUSES.map((status) => (
            <option key={status} value={status}>
              {toLabel(status)}
            </option>
          ))}
        </Select>
        <Select
          label="Platform"
          value={filters.platform}
          onChange={(event) =>
            update('platform', event.target.value as SocialPlatform | 'ALL')
          }
        >
          <option value="ALL">All platforms</option>
          {SOCIAL_PLATFORMS.map((platform) => (
            <option key={platform} value={platform}>
              {toLabel(platform)}
            </option>
          ))}
        </Select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-separator bg-surface">
        <Table
          variant="secondary"
        >
          <Table.ScrollContainer>
            <Table.Content
              aria-label="Social posts"
              className="h-full min-w-[1040px] table-fixed text-left text-sm"
              selectionMode="none"
            >
              <Table.Header className="text-xs font-semibold text-muted">
                <Table.Column
                  className="w-[340px] px-4 py-3 font-medium rounded-b-none"
                  id="post"
                  isRowHeader
                >
                  Post
                </Table.Column>
                <Table.Column
                  className="w-[190px] px-4 py-3 font-medium"
                  id="platforms"
                >
                  Platforms
                </Table.Column>
                <Table.Column
                  className="w-[150px] px-4 py-3 font-medium"
                  id="status"
                >
                  Status
                </Table.Column>
                <Table.Column
                  className="w-[110px] px-4 py-3 font-medium"
                  id="products"
                >
                  Products
                </Table.Column>
                <Table.Column
                  className="w-[150px] px-4 py-3 font-medium"
                  id="updated"
                >
                  Updated
                </Table.Column>
                <Table.Column
                  className="w-[100px] rounded-b-none px-4 py-3 text-right font-medium rounded-b-none" 
                  id="actions"
                >
                  Actions
                </Table.Column>
              </Table.Header>
              <Table.Body
                renderEmptyState={() => {
                  if (postsQuery.isPending) {
                    return <LoadingState label="Loading social posts" />;
                  }
                  if (postsQuery.isError) {
                    return (
                      <TableErrorState
                        message={postsQuery.error.message}
                        onRetry={() => postsQuery.refetch()}
                      />
                    );
                  }
                  return (
                    <SocialPostEmptyState
                      canCreate={canCreate}
                      platform={filters.platform}
                      search={deferredSearch}
                      status={filters.status}
                      onCreate={() => router.push('/social-posts/new')}
                    />
                  );
                }}
              >
                {posts.map((post) => (
                  <Table.Row
                    className="border-t border-separator hover:bg-surface-secondary/60"
                    id={post.id}
                    key={post.id}
                  >
                    <Table.Cell className="px-4 py-4">
                      <Link
                        className="font-semibold hover:text-accent"
                        href={`/social-posts/${post.id}`}
                      >
                        {post.title}
                      </Link>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                        {post.content}
                      </p>
                    </Table.Cell>
                    <Table.Cell className="px-4 py-4">
                      {post.targetPlatforms.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {post.targetPlatforms.map((platform) => (
                            <span
                              className="rounded-md bg-accent/8 px-2 py-1 text-[10px] font-semibold text-accent"
                              key={platform}
                            >
                              {toLabel(platform)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted">
                          No platforms selected
                        </span>
                      )}
                    </Table.Cell>
                    <Table.Cell className="px-4 py-4">
                      <SocialPostStatusBadge status={post.status} />
                    </Table.Cell>
                    <Table.Cell className="px-4 py-4 text-right font-semibold">
                      {post.hotspots.length}
                    </Table.Cell>
                    <Table.Cell className="px-4 py-4 text-xs text-muted">
                      <DateTimeText value={post.updatedAt} />
                    </Table.Cell>
                    <Table.Cell className="px-4 py-4 text-right">
                      <Link
                        className="text-sm font-semibold text-accent hover:underline"
                        href={`/social-posts/${post.id}`}
                      >
                        View
                      </Link>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
          {postMeta && posts.length ? (
            <Table.Footer>
              <Pagination size="sm">
                <Pagination.Summary className="text-xs text-muted">
                  {postMeta.total} total posts
                </Pagination.Summary>
                <Pagination.Content>
                  <Pagination.Item>
                    <Pagination.Previous
                      isDisabled={!postMeta.hasPrev}
                      onPress={() =>
                        setFilters((current) => ({
                          ...current,
                          page: current.page - 1,
                        }))
                      }
                    >
                      <Pagination.PreviousIcon />
                      Prev
                    </Pagination.Previous>
                  </Pagination.Item>
                  <Pagination.Item>
                    <span className="px-2 text-xs text-muted">
                      Page {postMeta.page} of {Math.max(postMeta.totalPages, 1)}
                    </span>
                  </Pagination.Item>
                  <Pagination.Item>
                    <Pagination.Next
                      isDisabled={!postMeta.hasNext}
                      onPress={() =>
                        setFilters((current) => ({
                          ...current,
                          page: current.page + 1,
                        }))
                      }
                    >
                      Next
                      <Pagination.NextIcon />
                    </Pagination.Next>
                  </Pagination.Item>
                </Pagination.Content>
              </Pagination>
            </Table.Footer>
          ) : null}
        </Table>
      </div>
    </section>
  );
}

function TableStateContent({ children }: { children: ReactNode }) {
  return (
    <HeroEmptyState className="flex h-full min-h-64 w-full flex-col items-center justify-center gap-4 text-center md:min-h-[calc(100dvh-30rem)]">
      {children}
    </HeroEmptyState>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <TableStateContent>
      <Icon
        className="size-6 animate-spin text-muted"
        icon="gravity-ui:arrows-rotate-right"
      />
      <span className="text-sm text-muted">{label}</span>
    </TableStateContent>
  );
}

function SocialPostEmptyState({
  canCreate,
  onCreate,
  platform,
  search,
  status,
}: {
  canCreate: boolean;
  onCreate: () => void;
  platform: SocialPlatform | 'ALL';
  search: string;
  status: SocialPostStatus | 'ALL';
}) {
  const hasFilters = Boolean(search || status !== 'ALL' || platform !== 'ALL');

  return (
    <TableStateContent>
      <Icon className="size-6 text-muted" icon="gravity-ui:tray" />
      <span className="text-sm font-semibold">No social posts found</span>
      <span className="max-w-sm text-xs text-muted">
        {hasFilters
          ? 'Try changing your search or filters.'
          : 'Create a shoppable post to start sharing your catalog.'}
      </span>
      {canCreate && !hasFilters && (
        <Button type="button" variant="primary" onPress={onCreate}>
          Create social post
        </Button>
      )}
    </TableStateContent>
  );
}

function TableErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <TableStateContent>
      <Icon className="size-6 text-danger" icon="gravity-ui:circle-xmark" />
      <span className="text-sm font-semibold">
        Social posts are unavailable
      </span>
      <span className="max-w-sm text-xs text-muted">{message}</span>
      <Button type="button" variant="primary" onPress={onRetry}>
        Try again
      </Button>
    </TableStateContent>
  );
}

function toLabel(value: string) {
  return value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^\w/, (letter) => letter.toUpperCase());
}
