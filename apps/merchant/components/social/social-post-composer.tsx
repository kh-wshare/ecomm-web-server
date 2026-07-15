"use client";

import { useMemo, useState } from "react";
import { Button, Checkbox } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { isVideoUrl, PlatformPreview, platformLabel } from "./platform-preview";

import { Input, Select, TextArea } from "@/components/products/product-controls";
import type { Product } from "@/types/product";
import type { HotspotPayload, SocialPlatform } from "@/types/social";
import { usePermissions } from "@/hooks/use-permissions";
import { getProducts } from "@/lib/products/product-data";
import {
  addSocialHotspot,
  createSocialPost,
  publishSocialPost,
} from "@/lib/social/social-data";
import { queryKeys } from "@repo/query-client";
import { notify } from "@/lib/toast/notify";
import { socialPostComposerSchema } from "@/lib/validation/social-post";
import { SOCIAL_PLATFORMS } from "@/types/social";

type DraftHotspot = HotspotPayload & { key: string };
type SubmitMode = "draft" | "publish";

export function SocialPostComposer() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canCreate = can("social.manage");
  const canPublish = can("social.manage");
  const canAddHotspots = can("social.manage");
  const canReadProducts = can("products.read");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaInput, setMediaInput] = useState("");
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(["WEBSITE"]);
  const [previewPlatform, setPreviewPlatform] =
    useState<SocialPlatform>("WEBSITE");
  const [hotspots, setHotspots] = useState<DraftHotspot[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const productsQuery = useQuery({
    queryKey: queryKeys.products.list({
      search: "",
      status: "ACTIVE",
      channel: "ALL",
      inventory: false,
      socialComposer: true,
    }),
    queryFn: () =>
      getProducts({ search: "", status: "ACTIVE", channel: "ALL" }, false),
    enabled: canCreate && canAddHotspots && canReadProducts,
  });
  const saveMutation = useMutation({
    mutationFn: async (mode: SubmitMode) => {
      const post = await createSocialPost({
        title: title.trim(),
        ...(slug.trim() ? { slug: slug.trim() } : {}),
        content: content.trim(),
        ...(mediaUrls.length ? { mediaUrls } : {}),
      });

      for (const { key: _key, ...hotspot } of hotspots) {
        await addSocialHotspot(post.id, hotspot);
      }

      if (mode === "publish") {
        return (await publishSocialPost(post.id, platforms)).post;
      }

      return post;
    },
    onSuccess: async (post, mode) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.socialPosts.all,
      });
      notify.success(
        mode === "publish" ? "Publishing complete" : "Draft saved",
        mode === "publish"
          ? "Review the per-platform results on the post detail page."
          : "Your social post is ready for more work.",
      );
      router.push(`/social-posts/${post.id}`);
    },
    onError: (error) => notify.error(error, "Unable to save social post"),
  });

  if (!canCreate) {
    return (
      <div className="rounded-2xl border border-warning/30 bg-warning/10 p-6 text-sm">
        You do not have permission to create social posts.
      </div>
    );
  }

  const submit = (mode: SubmitMode) => {
    const nextErrors: Record<string, string> = {};
    const result = socialPostComposerSchema.safeParse({
      title,
      slug,
      content,
      mediaUrls,
      platforms,
    });
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = String(issue.path[0] ?? "_form");
        nextErrors[field] ??= issue.message;
      });
    }
    if (mode === "publish" && !platforms.length)
      nextErrors.platforms = "Select at least one platform.";
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      notify.warning("Check the highlighted post fields");
      return;
    }

    saveMutation.mutate(mode);
  };

  return (
    <section className="space-y-6">
      <header>
        <Link
          className="text-sm font-medium text-accent hover:underline"
          href="/social-posts"
        >
          ← Social posts
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Create social post
        </h2>
        <p className="mt-2 text-sm text-muted">
          Compose once, preview each channel, and connect live catalog items.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <div className="space-y-6">
          <Panel title="Post content">
            <div className="space-y-4">
              <Field label="Title" error={errors.title} required>
                <Input
                  className={inputClass(errors.title)}
                  maxLength={160}
                  placeholder="Summer collection is here"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    clearError("title", setErrors);
                  }}
                />
              </Field>
              <Field
                label="URL slug"
                hint="Optional; generated from the title when left blank."
                error={errors.slug}
              >
                <Input
                  className={inputClass(errors.slug)}
                  maxLength={180}
                  placeholder="summer-collection"
                  value={slug}
                  onChange={(event) => {
                    setSlug(event.target.value);
                    clearError("slug", setErrors);
                  }}
                />
              </Field>
              <Field
                label="Content"
                hint={`${content.length.toLocaleString()} / 20,000`}
                error={errors.content}
                required
              >
                <TextArea
                  className={`${inputClass(errors.content)} min-h-44 resize-y py-3`}
                  maxLength={20_000}
                  placeholder="Tell customers what makes this collection special…"
                  value={content}
                  onChange={(event) => {
                    setContent(event.target.value);
                    clearError("content", setErrors);
                  }}
                />
              </Field>
            </div>
          </Panel>

          <Panel
            title="Media"
            description="Attach up to 10 hosted image or video URLs."
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                className="h-11 flex-1 rounded-xl border border-separator bg-background px-3 text-sm outline-none focus:border-accent"
                placeholder="https://cdn.example.com/campaign.jpg"
                type="url"
                value={mediaInput}
                onChange={(event) => setMediaInput(event.target.value)}
              />
              <Button
                isDisabled={!mediaInput.trim() || mediaUrls.length >= 10}
                type="button"
                variant="secondary"
                onPress={() => {
                  if (!isHttpUrl(mediaInput)) {
                    notify.warning("Enter a complete http or https media URL");
                    return;
                  }
                  if (!mediaUrls.includes(mediaInput.trim())) {
                    setMediaUrls((current) => [...current, mediaInput.trim()]);
                  }
                  setMediaInput("");
                }}
              >
                Add media
              </Button>
            </div>
            {mediaUrls.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {mediaUrls.map((url, index) => (
                  <div
                    className="group relative aspect-video overflow-hidden rounded-xl bg-surface-secondary bg-cover bg-center"
                    key={url}
                    style={
                      isVideoUrl(url)
                        ? undefined
                        : { backgroundImage: `url("${url}")` }
                    }
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
                      Media {index + 1}
                    </span>
                    <Button
                      aria-label={`Remove media ${index + 1}`}
                      className="absolute right-2 top-2"
                      size="sm"
                      type="button"
                      variant="danger-soft"
                      onPress={() =>
                        setMediaUrls((current) =>
                          current.filter((item) => item !== url),
                        )
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            title="Product hotspots"
            description="Hotspots always resolve current product availability and pricing."
          >
            {!canAddHotspots ? (
              <p className="text-sm text-muted">
                You can create the post, but you do not have permission to add
                product hotspots.
              </p>
            ) : !canReadProducts ? (
              <p className="text-sm text-muted">
                Product read permission is required to select hotspot items.
              </p>
            ) : productsQuery.isPending ? (
              <div className="h-28 animate-pulse rounded-xl bg-surface-secondary" />
            ) : productsQuery.isError ? (
              <p className="text-sm text-danger">
                {productsQuery.error.message}
              </p>
            ) : (
              <HotspotEditor
                hotspots={hotspots}
                products={productsQuery.data}
                onAdd={(hotspot) =>
                  setHotspots((current) => [...current, hotspot])
                }
                onRemove={(key) =>
                  setHotspots((current) =>
                    current.filter((item) => item.key !== key),
                  )
                }
              />
            )}
          </Panel>

          <Panel title="Publishing platforms">
            <div className="grid gap-3 sm:grid-cols-2">
              {SOCIAL_PLATFORMS.map((platform) => {
                const checked = platforms.includes(platform);
                return (
                  <label
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-separator p-4 transition"
                    key={platform}
                  >
                    <Checkbox
                      isSelected={checked}
                      onChange={(nextChecked) => {
                        setPlatforms((current) =>
                          nextChecked
                            ? [...current, platform]
                            : current.filter((item) => item !== platform),
                        );
                        clearError("platforms", setErrors);
                      }}
                    >
                      <Checkbox.Content>
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                      </Checkbox.Content>
                    </Checkbox>
                    <span className="text-sm font-semibold">
                      {platformLabel(platform)}
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.platforms && (
              <p className="mt-2 text-xs text-danger">{errors.platforms}</p>
            )}
            <p className="mt-3 text-xs text-muted">
              External platforms require a configured provider adapter. Website
              publishing creates a storefront article immediately.
            </p>
          </Panel>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-2xl border border-separator bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">Platform preview</h3>
              <Select
                aria-label="Preview platform"
                className="h-9 rounded-lg border border-separator bg-background px-2 text-xs font-semibold"
                value={previewPlatform}
                onChange={(event) =>
                  setPreviewPlatform(event.target.value as SocialPlatform)
                }
              >
                {SOCIAL_PLATFORMS.map((platform) => (
                  <option key={platform} value={platform}>
                    {platformLabel(platform)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="mt-5">
              <PlatformPreview
                content={content}
                mediaUrl={mediaUrls[0]}
                platform={previewPlatform}
                title={title}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <Button
              isDisabled={saveMutation.isPending}
              type="button"
              variant="secondary"
              onPress={() => submit("draft")}
            >
              {saveMutation.isPending ? "Saving…" : "Save draft"}
            </Button>
            {canPublish && (
              <Button
                isDisabled={saveMutation.isPending}
                type="button"
                variant="primary"
                onPress={() => submit("publish")}
              >
                {saveMutation.isPending ? "Publishing…" : "Publish post"}
              </Button>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

export function HotspotEditor({
  hotspots,
  onAdd,
  onRemove,
  products,
}: {
  hotspots: DraftHotspot[];
  onAdd: (hotspot: DraftHotspot) => void;
  onRemove: (key: string) => void;
  products: Product[];
}) {
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [label, setLabel] = useState("");
  const [xPercent, setXPercent] = useState("50");
  const [yPercent, setYPercent] = useState("50");
  const product = useMemo(
    () => products.find((item) => item.id === productId),
    [productId, products],
  );

  const add = () => {
    const x = Number(xPercent);
    const y = Number(yPercent);
    if (!productId) {
      notify.warning("Select an active product");
      return;
    }
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x < 0 ||
      x > 100 ||
      y < 0 ||
      y > 100
    ) {
      notify.warning("Hotspot positions must be between 0 and 100");
      return;
    }
    if (
      hotspots.some(
        (item) =>
          item.productId === productId && (item.variantId ?? "") === variantId,
      )
    ) {
      notify.warning("That product hotspot is already added");
      return;
    }
    onAdd({
      key: crypto.randomUUID(),
      productId,
      ...(variantId ? { variantId } : {}),
      xPercent: x,
      yPercent: y,
      ...(label.trim() ? { label: label.trim() } : {}),
    });
    setProductId("");
    setVariantId("");
    setLabel("");
  };

  return (
    <div>
      {!products.length ? (
        <p className="text-sm text-muted">
          Create an active product before adding a hotspot.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-xs font-medium text-muted">
              Product
            </span>
            <Select
              className="h-11 w-full rounded-xl border border-separator bg-background px-3 text-sm"
              value={productId}
              onChange={(event) => {
                setProductId(event.target.value);
                setVariantId("");
              }}
            >
              <option value="">Select a product</option>
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-muted">
              Variant
            </span>
            <Select
              className="h-11 w-full rounded-xl border border-separator bg-background px-3 text-sm disabled:opacity-50"
              disabled={!product?.variants?.length}
              value={variantId}
              onChange={(event) => setVariantId(event.target.value)}
            >
              <option value="">Base product</option>
              {product?.variants
                ?.filter((variant) => variant.status === "ACTIVE")
                .map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name}
                  </option>
                ))}
            </Select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-muted">
              Horizontal position (%)
            </span>
            <Input
              className="h-11 w-full rounded-xl border border-separator bg-background px-3 text-sm"
              max="100"
              min="0"
              step="0.01"
              type="number"
              value={xPercent}
              onChange={(event) => setXPercent(event.target.value)}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-muted">
              Vertical position (%)
            </span>
            <Input
              className="h-11 w-full rounded-xl border border-separator bg-background px-3 text-sm"
              max="100"
              min="0"
              step="0.01"
              type="number"
              value={yPercent}
              onChange={(event) => setYPercent(event.target.value)}
            />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-muted">
              Label
            </span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                className="h-11 flex-1 rounded-xl border border-separator bg-background px-3 text-sm"
                maxLength={80}
                placeholder="Shop this look"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
              <Button type="button" variant="secondary" onPress={add}>
                Add hotspot
              </Button>
            </div>
          </label>
        </div>
      )}
      {hotspots.length > 0 && (
        <div className="mt-4 space-y-2">
          {hotspots.map((hotspot) => {
            const selectedProduct = products.find(
              (item) => item.id === hotspot.productId,
            );
            const variant = selectedProduct?.variants?.find(
              (item) => item.id === hotspot.variantId,
            );
            return (
              <div
                className="flex items-center justify-between gap-3 rounded-xl bg-surface-secondary px-3 py-2.5"
                key={hotspot.key}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {selectedProduct?.name}
                    {variant ? ` · ${variant.name}` : ""}
                  </p>
                  <p className="text-xs text-muted">
                    {hotspot.label || "Product hotspot"} · {hotspot.xPercent}%,{" "}
                    {hotspot.yPercent}%
                  </p>
                </div>
                <Button
                  size="sm"
                  type="button"
                  variant="danger-soft"
                  onPress={() => onRemove(hotspot.key)}
                >
                  Remove
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Panel({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-separator bg-surface p-5 shadow-sm">
      <h3 className="font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  children,
  error,
  hint,
  label,
  required,
}: {
  children: React.ReactNode;
  error?: string;
  hint?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between gap-2 text-xs font-medium text-muted">
        <span>
          {label}
          {required ? " *" : ""}
        </span>
        {hint && <span className="font-normal">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

function inputClass(error?: string) {
  return `h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-accent ${
    error ? "border-danger" : "border-separator"
  }`;
}

function clearError(
  key: string,
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>,
) {
  setErrors((current) => {
    const next = { ...current };
    delete next[key];
    return next;
  });
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
