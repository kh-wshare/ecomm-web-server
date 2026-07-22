import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { ProductCategoryStatus } from '#app/generated/prisma/enums';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateProductCategoryDto {
  @ApiProperty({ example: 'Coffee', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    example: 'coffee',
    pattern: SLUG_PATTERN.source,
    maxLength: 140,
  })
  @IsString()
  @Matches(SLUG_PATTERN)
  @MaxLength(140)
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/category-logo.png',
    maxLength: 2048,
    nullable: true,
  })
  @IsString()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  @IsOptional()
  logoUrl?: string | null;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({
    enum: ProductCategoryStatus,
    default: ProductCategoryStatus.ACTIVE,
  })
  @IsEnum(ProductCategoryStatus)
  @IsOptional()
  status?: ProductCategoryStatus;
}

export class UpdateProductCategoryDto extends PartialType(
  CreateProductCategoryDto,
) {}
