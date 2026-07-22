import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { BaseQueryDto } from '#app/common/dto/base-query.dto';
import { ProductStatus } from '#app/generated/prisma/enums';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class ProductQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({ enum: ProductStatus })
  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

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
