import { SocialPostDetail } from "@/components/social/social-post-detail";

export default async function SocialPostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <SocialPostDetail postId={id} />;
}
