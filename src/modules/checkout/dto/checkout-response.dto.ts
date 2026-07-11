import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CheckoutSessionStatus,
  SalesChannel,
} from '#app/generated/prisma/enums';

export class CheckoutItemDto {
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

  @ApiProperty({ example: '19.99' })
  unitPrice!: string;

  @ApiProperty({ example: '39.98' })
  totalPrice!: string;
}

export class CheckoutOrderDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  orderNumber!: string;

  @ApiProperty()
  status!: string;
}

export class CheckoutSessionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  customerId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  customerName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  customerEmail!: string | null;

  @ApiPropertyOptional({ nullable: true })
  customerPhone!: string | null;

  @ApiProperty({ enum: SalesChannel })
  sourceChannel!: SalesChannel;

  @ApiProperty({ enum: CheckoutSessionStatus })
  status!: CheckoutSessionStatus;

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

  @ApiProperty()
  expiresAt!: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: [CheckoutItemDto] })
  items!: CheckoutItemDto[];

  @ApiPropertyOptional({ type: CheckoutOrderDto, nullable: true })
  order!: CheckoutOrderDto | null;
}

export class CreatedCheckoutSessionDto extends CheckoutSessionDto {
  @ApiProperty({
    description:
      'Secret returned once; send it as X-Checkout-Token for session operations',
  })
  checkoutToken!: string;
}
