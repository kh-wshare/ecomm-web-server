import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
} from '#app/generated/prisma/enums';

export class PosOrderTotalsDto {
  @ApiProperty()
  subtotal!: string;

  @ApiProperty()
  discount!: string;

  @ApiProperty()
  tax!: string;

  @ApiProperty()
  total!: string;

  @ApiProperty()
  paid!: string;

  @ApiProperty()
  remaining!: string;
}

export class PosOrderItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  variantId!: string | null;

  @ApiProperty()
  sku!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  orderedQuantity!: number;

  @ApiProperty()
  sentToKitchenQuantity!: number;

  @ApiProperty()
  preparedQuantity!: number;

  @ApiProperty()
  cancelledQuantity!: number;

  @ApiProperty()
  unitPrice!: string;

  @ApiProperty()
  totalPrice!: string;
}

export class PosOrderDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  localId!: string | null;

  @ApiProperty()
  orderNumber!: string;

  @ApiProperty({ enum: OrderStatus })
  orderStatus!: OrderStatus;

  @ApiProperty({ enum: FulfillmentStatus })
  fulfillmentStatus!: FulfillmentStatus;

  @ApiProperty({ enum: PaymentStatus })
  paymentStatus!: PaymentStatus;

  @ApiPropertyOptional({ nullable: true })
  tableId!: string | null;

  @ApiProperty({ type: [PosOrderItemDto] })
  items!: PosOrderItemDto[];

  @ApiProperty()
  totals!: PosOrderTotalsDto;
}
