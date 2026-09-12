import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

const POS_PAYMENT_METHODS = ['CASH', 'KHQR'] as const;
export type PosPaymentMethod = (typeof POS_PAYMENT_METHODS)[number];

export class CreatePosPaymentDto {
  @ApiProperty({ enum: POS_PAYMENT_METHODS })
  @IsIn(POS_PAYMENT_METHODS)
  paymentMethod!: PosPaymentMethod;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Cash tendered by the customer (CASH only)',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  cashReceived?: number;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Order item ids this payment settles (informational; full/partial split by amount is always enforced)',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  orderItemIds?: string[];
}

export class CreatePosRefundDto {
  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ example: 'Customer cancellation' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  returnStock?: boolean;
}
