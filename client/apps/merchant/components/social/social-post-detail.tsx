"use client";

import { useState } from "react";
import { Button, Checkbox } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

import { isVideoUrl, platformLabel } from "./platform-preview";
import { SocialPostStatusBadge } from "./social-post-status-badge";

import type { SocialPlatform } from "@/types/social";
import { DataTable, DateTimeText, LoadingState } from "@repo/ui";
import { env } from "@/lib/env";
import { usePermissions } from "@/hooks/use-permissions";
import { formatDate } from "@/lib/formatters/date";
import {
  getSocialPost,
  getSocialPublishLogs,
  publishSocialPost,
} from "@/lib/social/social-data";
import { queryKeys } from "@repo/query-client";
import { notify } from "@/lib/toast/notify";
import { SOCIAL_PLATFORMS } from "@/types/social";

export function SocialPostDetail({ postId }: { postId: string }) {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canRead = can("social.manage");
  const canPublish = can("social.manage");
  const [platformOverride, setPlatformOverride] = useState<
    SocialPlatform[] | null
  >(null);
  const postQuery = useQuery({
    queryKey: queryKeys.socialPosts.detail(postId),
    queryFn: () => getSocialPost(postId),
    enabled: canRead,
  });
  const logsQuery = useQuery({
    queryKey: queryKeys.socialPosts.logs(postId),
    queryFn: () => getSocialPublishLogs(postId),
    enabled: canRead,
  });
  const platforms: SocialPlatform[] =
    platformOverride ??
    (postQuery.data?.targetPlatforms.length
      ? postQuery.data.targetPlatforms
      : ["WEBSITE"]);
  const publishMutation = useMutation({
    mutationFn: () => publishSocialPost(postId, platforms),
    onSuccess: async (result) => {
      const failures = result.results.filter(
        (item) => item.status === "FAILED",
      ).length;
      notify[failures ? "warning" : "success"](
        failures ? "Publishing completed with failures" : "Post published",
        failures
          ? "Review the publishing log for provider details."
          : "All selected platforms accepted the post.",
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.socialPosts.all,
        }),
        postQuery.refetch(),
        logsQuery.refetch(),
      ]);
    },
    onError: (error) => notify.error(error, "Unable to publish social post"),
  });

  if (!canRead) {
    return (
      <div className="rounded-2xl border border-warning/30 bg-warning/10 p-6 text-sm">
        You do not have permission to view social post details.
      </div>
    );
  }

  if (postQuery.isPending) {
    return <LoadingState className="h-[680px]" label="Loading social post" />;
  }

  if (postQuery.isError) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-center">
        <div>
          <h2 className="text-xl font-semibold">Social post is unavailable</h2>
          <p className="mt-2 text-sm text-muted">{postQuery.error.message}</p>
          <Button
            className="mt-5"
            type="button"
            variant="primary"
            onPress={() => postQuery.refetch()}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const post = postQuery.data;
  const websiteUrl = logsQuery.data?.find(
    (log) =>
      log.platform === "WEBSITE" &&
      log.status === "PUBLISHED" &&
      log.externalUrl,
  )?.externalUrl;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            className="text-sm font-medium text-accent hover:underline"
            href="/social-posts"
          >
            ← Social posts
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">
              {post.title}
            </h2>
            <SocialPostStatusBadge status={post.status} />
          </div>
          <p className="mt-2 text-sm text-muted">
            Updated {formatDate(post.updatedAt)}
          </p>
        </div>
        {websiteUrl && (
          <a
            className="inline-flex h-10 items-center justify-center rounded-xl border border-separator px-4 text-sm font-semibold"
            href={externalUrl(websiteUrl)}
            rel="noreferrer"
            target="_blank"
          >
            View website post ↗
          </a>
        )}
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="space-y-6">
          <Panel title="Post content">
            <p className="whitespace-pre-wrap text-sm leading-7">
              {post.content}
            </p>
            <dl className="mt-6 grid gap-4 border-t border-separator pt-5 sm:grid-cols-3">
              <Term label="Slug" value={post.slug} />
              <Term
                label="Created"
                value={formatDate(post.createdAt, { dateStyle: "medium" })}
              />
              <Term
                label="Published"
                value={
                  post.publishedAt
                    ? formatDate(post.publishedAt, { dateStyle: "medium" })
                    : "Not yet"
                }
              />
            </dl>
          </Panel>

          <Panel title={`Media (${post.mediaUrls.length})`}>
            {post.mediaUrls.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {post.mediaUrls.map((url, index) => (
                  <a
                    className="group relative aspect-video overflow-hidden rounded-xl bg-surface-secondary bg-cover bg-center"
                    href={url}
                    key={url}
                    rel="noreferrer"
                    style={
                      isVideoUrl(url)
                        ? undefined
                        : { backgroundImage: `url("${url}")` }
                    }
                    target="_blank"
                  >
                    {isVideoUrl(url) && (
                      <video
                        className="size-full object-cover"
                        muted
                        playsInline
                        src={url}
                      />
                    )}
                    <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">
                      Media {index + 1} ↗
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">
                No media is attached to this post.
              </p>
            )}
          </Panel>

          <Panel title={`Product hotspots (${post.hotspots.length})`}>
            {post.hotspots.length ? (
              <div className="space-y-3">
                {post.hotspots.map((hotspot) => (
                  <div
                    className="flex flex-col justify-between gap-3 rounded-xl border border-separator p-4 sm:flex-row sm:items-center"
                    key={hotspot.id}
                  >
                    <div>
                      <p className="font-semibold">
                        {hotspot.product?.name ?? "Catalog product"}
                        {hotspot.variant ? ` · ${hotspot.variant.name}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {hotspot.label || "Product hotspot"} · Position{" "}
                        {hotspot.xPercent}%, {hotspot.yPercent}%
                      </p>
                    </div>
                    <Link
                      className="text-xs font-semibold text-accent hover:underline"
                      href={`/products/${hotspot.productId}`}
                    >
                      View product →
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">
                No products are linked to this post.
              </p>
            )}
          </Panel>

          <Panel title="Publishing log">
            {logsQuery.isPending ? (
              <div className="h-40 animate-pulse rounded-xl bg-surface-secondary" />
            ) : logsQuery.isError ? (
              <div>
                <p className="text-sm text-danger">{logsQuery.error.message}</p>
                <Button
                  className="mt-3"
                  size="sm"
                  type="button"
                  variant="tertiary"
                  onPress={() => logsQuery.refetch()}
                >
                  Try again
                </Button>
              </div>
            ) : logsQuery.data.length ? (
              <DataTable
                caption="Publishing attempts"
                columns={[
                  {
                    key: "platform",
                    header: "Platform",
                    className: "font-semibold",
                    render: (log) => platformLabel(log.platform),
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (log) => (
                      <SocialPostStatusBadge status={log.status} />
                    ),
                  },
                  {
                    key: "attempted",
                    header: "Attempted",
                    className: "text-xs text-muted",
                    render: (log) => <DateTimeText value={log.createdAt} />,
                  },
                  {
                    key: "result",
                    header: "Result",
                    className: "max-w-sm text-xs",
                    render: (log) =>
                      log.externalUrl ? (
                        <a
                          className="font-semibold text-accent hover:underline"
                          href={externalUrl(log.externalUrl)}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Open published post ↗
                        </a>
                      ) : (
                        <span className="text-danger">
                          {log.error || "Publishing failed"}
                        </span>
                      ),
                  },
                ]}
                getRowKey={(log) => log.id}
                rows={logsQuery.data}
              />
            ) : (
              <p className="text-sm text-muted">
                This post has not been published yet.
              </p>
            )}
          </Panel>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <Panel title="Destinations">
            <div className="space-y-2">
              {SOCIAL_PLATFORMS.map((platform) => {
                const selected = platforms.includes(platform);
                const latest = logsQuery.data?.find(
                  (log) => log.platform === platform,
                );
                return (
                  <label
                    className="flex items-center justify-between gap-3 rounded-xl border border-separator p-3"
                    key={platform}
                  >
                    <span className="flex items-center gap-3">
                      {canPublish && (
                        <Checkbox
                          isSelected={selected}
                          onChange={(checked) =>
                            setPlatformOverride(
                              checked
                                ? [...platforms, platform]
                                : platforms.filter((item) => item !== platform),
                            )
                          }
                        >
                          <Checkbox.Content>
                            <Checkbox.Control>
                              <Checkbox.Indicator />
                            </Checkbox.Control>
                          </Checkbox.Content>
                        </Checkbox>
                      )}
                      <span className="text-sm font-semibold">
                        {platformLabel(platform)}
                      </span>
                    </span>
                    {latest ? (
                      <SocialPostStatusBadge status={latest.status} />
                    ) : (
                      <span className="text-[10px] font-medium text-muted">
                        NOT ATTEMPTED
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
            {canPublish && (
              <Button
                className="mt-4 w-full"
                isDisabled={!platforms.length || publishMutation.isPending}
                type="button"
                variant="primary"
                onPress={() => publishMutation.mutate()}
              >
                {publishMutation.isPending
                  ? "Publishing…"
                  : post.status === "DRAFT"
                    ? "Publish post"
                    : "Publish selected"}
              </Button>
            )}
          </Panel>

          <Panel title="At a glance">
            <dl className="space-y-4">
              <Term
                label="Products linked"
                value={String(post.hotspots.length)}
              />
              <Term
                label="Media attached"
                value={String(post.mediaUrls.length)}
              />
              <Term
                label="Target platforms"
                value={
                  post.targetPlatforms.length
                    ? post.targetPlatforms
                        .map((platform) => platformLabel(platform))
                        .join(", ")
                    : "None"
                }
              />
              <Term label="Post ID" value={post.id} />
            </dl>
          </Panel>
        </aside>
      </div>
    </section>
  );
}

function Panel({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-separator bg-surface p-5 shadow-sm">
      <h3 className="mb-5 font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1 break-all text-sm font-medium">{value}</dd>
    </div>
  );
}

function externalUrl(url: string) {
  return /^https?:\/\//.test(url)
    ? url
    : `${env.NEXT_PUBLIC_API_URL}/${url.replace(/^\/+/, "")}`;
}
