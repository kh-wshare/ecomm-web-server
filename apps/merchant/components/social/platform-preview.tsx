import type { SocialPlatform } from "@/types/social";

export function PlatformPreview({
  content,
  mediaUrl,
  platform,
  title,
}: {
  content: string;
  mediaUrl?: string;
  platform: SocialPlatform;
  title: string;
}) {
  const isVideo = mediaUrl ? isVideoUrl(mediaUrl) : false;

  return (
    <article
      className={`mx-auto overflow-hidden border border-separator bg-background shadow-sm ${
        platform === "TIKTOK"
          ? "max-w-[280px] rounded-[2rem]"
          : "max-w-lg rounded-2xl"
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="grid size-9 place-items-center rounded-full bg-accent text-xs font-black text-accent-foreground">
          M
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">Your store</p>
          <p className="text-[10px] font-medium text-muted">
            {platformLabel(platform)} preview
          </p>
        </div>
        <span className="text-lg text-muted">•••</span>
      </div>
      <div
        className={`relative grid place-items-center bg-surface-secondary bg-cover bg-center ${
          platform === "TIKTOK"
            ? "aspect-[9/14]"
            : platform === "INSTAGRAM"
              ? "aspect-square"
              : "aspect-[16/10]"
        }`}
        style={
          mediaUrl && !isVideo
            ? { backgroundImage: `url("${mediaUrl}")` }
            : undefined
        }
      >
        {mediaUrl && isVideo && (
          <video
            className="absolute inset-0 size-full object-cover"
            controls
            muted
            playsInline
            src={mediaUrl}
          />
        )}
        {!mediaUrl && (
          <span className="px-6 text-center text-xs text-muted">
            Add media to see it here
          </span>
        )}
        {platform === "TIKTOK" && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-14 text-white">
            <p className="line-clamp-1 text-sm font-semibold">
              {title || "Post title"}
            </p>
            <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs">
              {content || "Your post content will appear here."}
            </p>
          </div>
        )}
      </div>
      {platform !== "TIKTOK" && (
        <div className="p-4">
          <p className="font-semibold">{title || "Post title"}</p>
          <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-sm leading-5 text-muted">
            {content || "Your post content will appear here."}
          </p>
          <p className="mt-3 text-xs font-semibold text-accent">
            Shop featured products
          </p>
        </div>
      )}
    </article>
  );
}

export const PlatformPreviewCard = PlatformPreview;

export function platformLabel(platform: SocialPlatform) {
  return platform
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

export function isVideoUrl(url: string) {
  return /\.(?:mp4|webm|mov|m4v)(?:[?#].*)?$/i.test(url);
}
