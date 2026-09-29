import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
} from 'class-validator';
import { BaseQueryDto } from '#app/common/dto/base-query.dto';
import {
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
  SalesChannel,
} from '#app/generated/prisma/enums';

export class OrderQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ enum: FulfillmentStatus })
  @IsOptional()
  @IsEnum(FulfillmentStatus)
  fulfillmentStatus?: FulfillmentStatus;

  @ApiPropertyOptional({ enum: SalesChannel })
  @IsOptional()
  @IsEnum(SalesChannel)
  sourceChannel?: SalesChannel;

  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-07-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

const MANUAL_ORDER_STATUSES = [
  OrderStatus.PROCESSING,
  OrderStatus.FULFILLED,
  OrderStatus.COMPLETED,
] as const;

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: MANUAL_ORDER_STATUSES })
  @IsIn(MANUAL_ORDER_STATUSES)
  status!: (typeof MANUAL_ORDER_STATUSES)[number];
}

export class RefundOrderDto {
  @ApiPropertyOptional({
    description:
      'Optional override; otherwise the merchant return-stock setting is used',
  })
  @IsOptional()
  @Transform(({ value }) => {
    const input: unknown = value;
    return input === true || input === 'true'
      ? true
      : input === false || input === 'false'
        ? false
        : input;
  })
  @IsBoolean()
  returnStock?: boolean;
}
