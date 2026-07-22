import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const POS_PAYMENT_METHODS = ['CASH', 'KHQR'] as const;
export type PosPaymentMethod = (typeof POS_PAYMENT_METHODS)[number];

export class CreatePosSaleItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  variantId?: string | null;

  @ApiProperty({ minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  quantity!: number;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class CreatePosSaleDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  branchId!: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerName?: string;

  @ApiProperty({ enum: POS_PAYMENT_METHODS })
  @IsIn(POS_PAYMENT_METHODS)
  paymentMethod!: PosPaymentMethod;

  @ApiPropertyOptional({ minimum: 0, maximum: 999999.99, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999.99)
  cashReceived?: number = 0;

  @ApiPropertyOptional({ minimum: 0, maximum: 999999.99, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999.99)
  discountAmount?: number = 0;

  @ApiPropertyOptional({ minimum: 0, maximum: 999999.99, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999.99)
  serviceChargeAmount?: number = 0;

  @ApiPropertyOptional({ minimum: 0, maximum: 999999.99, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999.99)
  taxAmount?: number = 0;

  @ApiProperty({ type: [CreatePosSaleItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreatePosSaleItemDto)
  items!: CreatePosSaleItemDto[];
}
