import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { BaseQueryDto } from '#app/common/dto/base-query.dto';
import { SalesChannel } from '#app/generated/prisma/enums';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class StorefrontProductQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({
    enum: SalesChannel,
    default: SalesChannel.WEBSITE,
  })
  @IsEnum(SalesChannel)
  @IsOptional()
  channel?: SalesChannel = SalesChannel.WEBSITE;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'coffee', pattern: SLUG_PATTERN.source })
  @IsString()
  @Matches(SLUG_PATTERN)
  @IsOptional()
  categorySlug?: string;
}
