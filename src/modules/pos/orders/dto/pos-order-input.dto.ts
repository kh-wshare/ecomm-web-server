import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { BaseQueryDto } from '#app/common/dto/base-query.dto';
import { OrderStatus, PaymentStatus } from '#app/generated/prisma/enums';

export class PosOrderItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  variantId?: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ example: 'Less spicy' })
  @IsString()
  @IsOptional()
  note?: string;
}

export class CreatePosOrderDto {
  @ApiPropertyOptional({ description: 'Client-generated id for offline dedup' })
  @IsString()
  @IsOptional()
  localId?: string;

  @ApiProperty({ example: 'POS-DEVICE-001' })
  @IsString()
  deviceId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  tableId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiPropertyOptional({ example: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  discountAmount?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty({ type: [PosOrderItemDto] })
  @ValidateNested({ each: true })
  @Type(() => PosOrderItemDto)
  @ArrayMinSize(1)
  items!: PosOrderItemDto[];
}

export class UpdatePosOrderDto {
  @ApiProperty({ type: [PosOrderItemDto] })
  @ValidateNested({ each: true })
  @Type(() => PosOrderItemDto)
  @ArrayMinSize(1)
  items!: PosOrderItemDto[];
}

export class PosOrderQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-09-30' })
  @IsString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsIn(Object.values(OrderStatus))
  @IsOptional()
  status?: OrderStatus;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsIn(Object.values(PaymentStatus))
  @IsOptional()
  paymentStatus?: PaymentStatus;
}

export class CancelPosOrderDto {
  @ApiPropertyOptional({ example: 'Customer cancelled' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class AssignPosOrderTableDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  tableId!: string;
}
