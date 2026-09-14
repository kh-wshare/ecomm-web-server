import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { SalesChannel } from '#app/generated/prisma/enums';

export class CartItemInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty({ minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  quantity!: number;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class UpdateCartItemDto {
  @ApiProperty({
    minimum: 0,
    maximum: 100,
    description: 'Zero removes the line',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  quantity!: number;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class CreateCartDto {
  @ApiPropertyOptional({
    enum: SalesChannel,
    default: SalesChannel.WEBSITE,
    description: 'POS is rejected; POS sells through its own flow',
  })
  @IsOptional()
  @IsEnum(SalesChannel)
  sourceChannel?: SalesChannel;

  @ApiPropertyOptional({
    type: [CartItemInputDto],
    description: 'Optional seed lines, so a cart can be created pre-filled',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CartItemInputDto)
  items?: CartItemInputDto[];
}

export class UpdateCartContactDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerName?: string;

  @ApiPropertyOptional({ format: 'email' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  customerEmail?: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  customerPhone?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class SelectCartDeliveryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  deliveryMethodId!: string;
}

export class CheckoutCartDto {
  @ApiPropertyOptional({ default: 15, minimum: 1, maximum: 120 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  expiresInMinutes?: number;
}

export class MerchantSlugParamDto {
  @ApiProperty({ example: 'acme-store' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(100)
  merchantSlug!: string;
}
