import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { BaseQueryDto } from '#app/common/dto/base-query.dto';
import { SocialPlatform, SocialPostStatus } from '#app/generated/prisma/enums';

export class CreateSocialPostDto {
  @ApiProperty({ maxLength: 160 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(160)
  title!: string;

  @ApiPropertyOptional({
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    maxLength: 180,
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(180)
  slug?: string;

  @ApiProperty({ maxLength: 20000 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(20000)
  content!: string;

  @ApiPropertyOptional({ type: [String], maxItems: 10 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsUrl({ require_protocol: true }, { each: true })
  mediaUrls?: string[];
}

export class UpdateSocialPostDto extends PartialType(CreateSocialPostDto) {}

export class AddHotspotDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty({ minimum: 0, maximum: 100 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  xPercent!: number;

  @ApiProperty({ minimum: 0, maximum: 100 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  yPercent!: number;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;
}

export class PublishSocialPostDto {
  @ApiProperty({ enum: SocialPlatform, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @ArrayUnique()
  @IsEnum(SocialPlatform, { each: true })
  platforms!: SocialPlatform[];
}

export class SocialPostQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({ enum: SocialPostStatus })
  @IsOptional()
  @IsEnum(SocialPostStatus)
  status?: SocialPostStatus;

  @ApiPropertyOptional({ enum: SocialPlatform })
  @IsOptional()
  @IsEnum(SocialPlatform)
  platform?: SocialPlatform;
}

export class SocialLinkQueryDto {
  @ApiPropertyOptional({ enum: SocialPlatform, default: 'WEBSITE' })
  @IsOptional()
  @IsEnum(SocialPlatform)
  platform: SocialPlatform = SocialPlatform.WEBSITE;
}
