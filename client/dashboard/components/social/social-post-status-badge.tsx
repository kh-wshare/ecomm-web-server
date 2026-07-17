import type { SocialPostStatus, SocialPublishStatus } from "@/types/social";
import { StatusBadge } from "@/components/ui/display";

export function SocialPostStatusBadge({
  status,
}: {
  status: SocialPostStatus | SocialPublishStatus;
}) {
  return <StatusBadge status={status} />;
}
