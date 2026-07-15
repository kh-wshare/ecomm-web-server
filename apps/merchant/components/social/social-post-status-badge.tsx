import type { SocialPostStatus, SocialPublishStatus } from "@/types/social";
import { StatusBadge } from "@repo/ui";

export function SocialPostStatusBadge({
  status,
}: {
  status: SocialPostStatus | SocialPublishStatus;
}) {
  return <StatusBadge status={status} />;
}
