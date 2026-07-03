import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
  SalesChannel,
} from '#app/generated/prisma/enums';

export class OrderItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  variantId!: string | null;

  @ApiProperty()
  sku!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unitPrice!: string;

  @ApiProperty()
  totalPrice!: string;
}

export class OrderDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  orderNumber!: string;

  @ApiProperty({ enum: SalesChannel })
  sourceChannel!: SalesChannel;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({ enum: PaymentStatus })
  paymentStatus!: PaymentStatus;

  @ApiProperty({ enum: FulfillmentStatus })
  fulfillmentStatus!: FulfillmentStatus;

  @ApiProperty()
  subtotalAmount!: string;

  @ApiProperty()
  discountAmount!: string;

  @ApiProperty()
  feeAmount!: string;

  @ApiProperty()
  totalAmount!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ type: [OrderItemDto] })
  items!: OrderItemDto[];
}
