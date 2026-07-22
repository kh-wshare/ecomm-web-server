import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDecimal,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ProductMediaType,
  ProductStatus,
  ProductVariantStatus,
  SalesChannel,
} from '#app/generated/prisma/enums';

const SKU_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MONEY_PATTERN = /^\d{1,10}(?:\.\d{1,2})?$/;

export class ProductVariantInputDto {
  @ApiProperty({ example: 'SHIRT-BLK-M', maxLength: 80 })
  @IsString()
  @Matches(SKU_PATTERN)
  @MaxLength(80)
  sku!: string;

  @ApiProperty({ example: 'Black / Medium', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: '29.99' })
  @IsString()
  @IsDecimal({ decimal_digits: '0,2' })
  @Matches(MONEY_PATTERN)
  price!: string;

  @ApiProperty({
    example: { color: 'black', size: 'M' },
    additionalProperties: true,
  })
  @IsObject()
  attributes!: Record<string, unknown>;

  @ApiPropertyOptional({
    enum: ProductVariantStatus,
    default: ProductVariantStatus.ACTIVE,
  })
  @IsEnum(ProductVariantStatus)
  @IsOptional()
  status?: ProductVariantStatus;
}

export class CreateProductInventoryInputDto {
  @ApiPropertyOptional({
    example: 'SHIRT-BLK-M',
    description:
      'Variant SKU to initialize. Omit to initialize the base product stock.',
    maxLength: 80,
  })
  @IsString()
  @Matches(SKU_PATTERN)
  @MaxLength(80)
  @IsOptional()
  variantSku?: string;

  @ApiPropertyOptional({ example: 25, minimum: 0, default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  initialStock?: number;

  @ApiPropertyOptional({ example: 2, minimum: 0, default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  safetyBuffer?: number;
}

export class ProductMediaInputDto {
  @ApiProperty({ example: 'https://cdn.example.com/products/shirt.jpg' })
  @IsUrl({ require_protocol: true })
  url!: string;

  @ApiPropertyOptional({
    enum: ProductMediaType,
    default: ProductMediaType.IMAGE,
  })
  @IsEnum(ProductMediaType)
  @IsOptional()
  type?: ProductMediaType;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export class ChannelVisibilityInputDto {
  @ApiProperty({ enum: SalesChannel })
  @IsEnum(SalesChannel)
  channel!: SalesChannel;

  @ApiProperty()
  @IsBoolean()
  isVisible!: boolean;

  @ApiProperty()
  @IsBoolean()
  isPurchasable!: boolean;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Classic T-Shirt', maxLength: 160 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({
    example: 'classic-t-shirt',
    pattern: SLUG_PATTERN.source,
    maxLength: 180,
  })
  @IsString()
  @Matches(SLUG_PATTERN)
  @MaxLength(180)
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(10000)
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'SHIRT-001', maxLength: 80 })
  @IsString()
  @Matches(SKU_PATTERN)
  @MaxLength(80)
  sku!: string;

  @ApiProperty({ example: '29.99' })
  @IsString()
  @IsDecimal({ decimal_digits: '0,2' })
  @Matches(MONEY_PATTERN)
  price!: string;

  @ApiPropertyOptional({ example: 'USD', default: 'USD' })
  @IsString()
  @Matches(/^[A-Za-z]{3}$/)
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    enum: ProductStatus,
    default: ProductStatus.DRAFT,
  })
  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @ApiPropertyOptional({ type: [ProductVariantInputDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ProductVariantInputDto)
  @IsOptional()
  variants?: ProductVariantInputDto[];

  @ApiPropertyOptional({ type: [ProductMediaInputDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ProductMediaInputDto)
  @IsOptional()
  media?: ProductMediaInputDto[];

  @ApiPropertyOptional({ type: [ChannelVisibilityInputDto] })
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => ChannelVisibilityInputDto)
  @IsOptional()
  channelVisibility?: ChannelVisibilityInputDto[];

  @ApiPropertyOptional({ type: [CreateProductInventoryInputDto] })
  @IsArray()
  @ArrayMaxSize(101)
  @ValidateNested({ each: true })
  @Type(() => CreateProductInventoryInputDto)
  @IsOptional()
  inventory?: CreateProductInventoryInputDto[];
}

export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['inventory'] as const),
) {}

export class UpdateChannelVisibilityDto {
  @ApiProperty({ type: [ChannelVisibilityInputDto] })
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => ChannelVisibilityInputDto)
  channels!: ChannelVisibilityInputDto[];
}
