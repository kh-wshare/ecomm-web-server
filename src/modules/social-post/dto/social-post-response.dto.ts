import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SocialPlatform,
  SocialPostStatus,
  SocialPublishStatus,
} from '#app/generated/prisma/enums';

export class ShoppableHotspotDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  variantId!: string | null;

  @ApiProperty()
  xPercent!: string;

  @ApiProperty()
  yPercent!: string;

  @ApiPropertyOptional()
  label!: string | null;
}

export class SocialPublishLogDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: SocialPlatform })
  platform!: SocialPlatform;

  @ApiProperty({ enum: SocialPublishStatus })
  status!: SocialPublishStatus;

  @ApiPropertyOptional()
  externalUrl!: string | null;

  @ApiPropertyOptional()
  error!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class SocialPostDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty({ type: [String] })
  mediaUrls!: string[];

  @ApiProperty({ enum: SocialPostStatus })
  status!: SocialPostStatus;

  @ApiProperty({ enum: SocialPlatform, isArray: true })
  targetPlatforms!: SocialPlatform[];

  @ApiProperty({ type: [ShoppableHotspotDto] })
  hotspots!: ShoppableHotspotDto[];
}

export class SocialLinkDto {
  @ApiProperty({ format: 'uuid' })
  hotspotId!: string;

  @ApiProperty()
  isAvailable!: boolean;

  @ApiProperty()
  product!: Record<string, unknown>;

  @ApiProperty()
  storefrontPath!: string;
}
