import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ProductMediaType,
  ProductStatus,
  ProductVariantStatus,
  SalesChannel,
} from '#app/generated/prisma/enums';
import { ProductCategoryDto } from '#app/modules/catalog/categories/dto/category-response.dto';

export class ProductVariantDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  sku!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ example: '29.99' })
  price!: string;

  @ApiProperty({ additionalProperties: true })
  attributes!: Record<string, unknown>;

  @ApiProperty({ enum: ProductVariantStatus })
  status!: ProductVariantStatus;
}

export class ProductMediaDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty({ enum: ProductMediaType })
  type!: ProductMediaType;

  @ApiProperty()
  sortOrder!: number;
}

export class ProductChannelVisibilityDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: SalesChannel })
  channel!: SalesChannel;

  @ApiProperty()
  isVisible!: boolean;

  @ApiProperty()
  isPurchasable!: boolean;
}

export class ProductDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  merchantId!: string;

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

  @ApiProperty({ enum: ProductStatus })
  status!: ProductStatus;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  categoryId!: string | null;

  @ApiPropertyOptional({ type: ProductCategoryDto, nullable: true })
  category?: ProductCategoryDto | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  deletedAt!: Date | null;

  @ApiPropertyOptional({ type: [ProductVariantDto] })
  variants?: ProductVariantDto[];

  @ApiPropertyOptional({ type: [ProductMediaDto] })
  media?: ProductMediaDto[];

  @ApiPropertyOptional({ type: [ProductChannelVisibilityDto] })
  channelVisibility?: ProductChannelVisibilityDto[];
}
