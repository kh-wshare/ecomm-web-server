import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SalesChannel } from '#app/generated/prisma/enums';

export class PublicMerchantDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ nullable: true })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;
}

export class PublicProductMediaDto {
  @ApiProperty()
  url!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  sortOrder!: number;
}

export class PublicProductCategoryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  sortOrder!: number;
}

export class PublicProductVariantDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  sku!: string;

  @ApiProperty({ example: '29.99' })
  price!: string;

  @ApiProperty({ additionalProperties: true })
  attributes!: Record<string, unknown>;

  @ApiProperty()
  isAvailable!: boolean;
}

export class PublicProductDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  sku!: string;

  @ApiProperty({ example: '29.99' })
  price!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ enum: SalesChannel })
  channel!: SalesChannel;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  categoryId!: string | null;

  @ApiPropertyOptional({ type: PublicProductCategoryDto, nullable: true })
  category!: PublicProductCategoryDto | null;

  @ApiProperty()
  baseIsAvailable!: boolean;

  @ApiProperty()
  isAvailable!: boolean;

  @ApiProperty()
  isPurchasable!: boolean;

  @ApiProperty({ type: [PublicProductMediaDto] })
  media!: PublicProductMediaDto[];

  @ApiProperty({ type: [PublicProductVariantDto] })
  variants!: PublicProductVariantDto[];
}

export class LiveThemeDto {
  @ApiProperty()
  version!: number;

  @ApiProperty({ additionalProperties: true })
  config!: Record<string, unknown>;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  publishedAt!: string | null;
}

export class PublicStorefrontDto {
  @ApiProperty({ type: PublicMerchantDto })
  merchant!: PublicMerchantDto;

  @ApiProperty({ type: LiveThemeDto })
  theme!: LiveThemeDto;

  @ApiProperty({ type: [PublicProductDto] })
  featuredProducts!: PublicProductDto[];
}
