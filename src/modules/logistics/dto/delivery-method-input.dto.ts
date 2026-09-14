import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  DeliveryMethodStatus,
  DeliveryMethodType,
} from '#app/generated/prisma/enums';

export class CreateDeliveryMethodDto {
  @ApiProperty({ maxLength: 120, example: 'Standard delivery' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'STANDARD', maxLength: 40 })
  @IsString()
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'code may only contain letters, digits, underscores and dashes',
  })
  @MaxLength(40)
  code!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    enum: DeliveryMethodType,
    default: DeliveryMethodType.DELIVERY,
  })
  @IsOptional()
  @IsEnum(DeliveryMethodType)
  type?: DeliveryMethodType;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Collection branch; only meaningful for PICKUP methods',
  })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ enum: DeliveryMethodStatus })
  @IsOptional()
  @IsEnum(DeliveryMethodStatus)
  status?: DeliveryMethodStatus;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ default: 0, minimum: 0, maximum: 9999 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}

export class UpdateDeliveryMethodDto extends PartialType(
  CreateDeliveryMethodDto,
) {}

export class CreateDeliveryZoneDto {
  @ApiProperty({ maxLength: 120, example: 'Phnom Penh' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    type: [String],
    maxItems: 200,
    example: ['KH'],
    description: 'ISO 3166-1 alpha-2 country codes. Empty matches any country.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  countries?: string[];

  @ApiPropertyOptional({
    type: [String],
    maxItems: 200,
    example: ['Phnom Penh'],
    description: 'Provinces/states. Empty matches any province.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  provinces?: string[];

  @ApiPropertyOptional({
    type: [String],
    maxItems: 200,
    example: ['Phnom Penh'],
    description: 'Cities. Empty matches any city.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  cities?: string[];

  @ApiPropertyOptional({
    type: [String],
    maxItems: 200,
    example: ['12000'],
    description: 'Postal codes. Empty matches any postal code.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  postalCodes?: string[];

  @ApiPropertyOptional({ example: '2.50', default: '0' })
  @IsOptional()
  @IsNumberString({ no_symbols: false })
  baseFee?: string;

  @ApiPropertyOptional({
    example: '0.50',
    default: '0',
    description: 'Added once per unit across the whole cart',
  })
  @IsOptional()
  @IsNumberString({ no_symbols: false })
  perItemFee?: string;

  @ApiPropertyOptional({
    example: '50.00',
    description: 'Shipping becomes free once the cart subtotal reaches this',
  })
  @IsOptional()
  @IsNumberString({ no_symbols: false })
  freeOverSubtotal?: string;

  @ApiPropertyOptional({
    example: '10.00',
    description: 'Zone is not offered below this cart subtotal',
  })
  @IsOptional()
  @IsNumberString({ no_symbols: false })
  minSubtotal?: string;

  @ApiPropertyOptional({
    example: '500.00',
    description: 'Zone is not offered above this cart subtotal',
  })
  @IsOptional()
  @IsNumberString({ no_symbols: false })
  maxSubtotal?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 365 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  estimatedMinDays?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 365 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  estimatedMaxDays?: number;

  @ApiPropertyOptional({
    default: false,
    description:
      'Matches any address, but only when no specific zone matched first',
  })
  @IsOptional()
  @IsBoolean()
  isFallback?: boolean;

  @ApiPropertyOptional({ default: 0, minimum: 0, maximum: 9999 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}

export class UpdateDeliveryZoneDto extends PartialType(CreateDeliveryZoneDto) {}

export class DeliveryMethodQueryDto {
  @ApiPropertyOptional({ enum: DeliveryMethodStatus })
  @IsOptional()
  @IsEnum(DeliveryMethodStatus)
  status?: DeliveryMethodStatus;

  @ApiPropertyOptional({ enum: DeliveryMethodType })
  @IsOptional()
  @IsEnum(DeliveryMethodType)
  type?: DeliveryMethodType;
}
