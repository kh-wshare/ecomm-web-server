import { z } from "zod";

import { SOCIAL_PLATFORMS } from "@/types/social";

export const socialPostComposerSchema = z.object({
  title: z.string().trim().min(1, "Post title is required").max(160),
  slug: z
    .string()
    .trim()
    .max(180)
    .refine(
      (value) => !value || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
      "Use a lowercase URL slug",
    ),
  content: z.string().trim().min(1, "Post content is required").max(20_000),
  mediaUrls: z.array(z.url("Enter a complete media URL")).max(10),
  platforms: z.array(z.enum(SOCIAL_PLATFORMS)).max(4),
});
