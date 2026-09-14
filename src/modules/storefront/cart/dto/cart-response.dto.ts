import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CartStatus, SalesChannel } from '#app/generated/prisma/enums';
import { AddressDto } from '#app/modules/logistics/dto/address.dto';
import { DeliveryOptionDto } from '#app/modules/logistics/dto/delivery-method-response.dto';

export class CartLineDto {
  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'The cart item id, used to update or remove the line',
  })
  id!: string | null;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
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

  @ApiPropertyOptional({ nullable: true })
  note!: string | null;
}

export class CartDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: CartStatus })
  status!: CartStatus;

  @ApiProperty({ enum: SalesChannel })
  sourceChannel!: SalesChannel;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  customerId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  customerName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  customerEmail!: string | null;

  @ApiPropertyOptional({ nullable: true })
  customerPhone!: string | null;

  @ApiPropertyOptional({ nullable: true })
  note!: string | null;

  @ApiProperty({ example: 'USD' })
  currency!: string;

  @ApiProperty({ example: '39.98' })
  subtotalAmount!: string;

  @ApiProperty({ example: '2.50' })
  shippingAmount!: string;

  @ApiProperty({ example: '42.48' })
  totalAmount!: string;

  @ApiProperty({ example: 2 })
  itemCount!: number;

  @ApiProperty({ type: [CartLineDto] })
  items!: CartLineDto[];

  @ApiPropertyOptional({ type: AddressDto, nullable: true })
  shippingAddress!: AddressDto | null;

  @ApiPropertyOptional({ type: AddressDto, nullable: true })
  billingAddress!: AddressDto | null;

  @ApiPropertyOptional({
    type: DeliveryOptionDto,
    nullable: true,
    description: 'The chosen delivery method, re-quoted at read time',
  })
  delivery!: DeliveryOptionDto | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  checkoutSessionId!: string | null;

  @ApiProperty()
  expiresAt!: Date;
}

export class CreatedCartDto extends CartDto {
  @ApiProperty({
    description:
      'Send as the X-Cart-Token header on every later request for this cart. Shown once.',
  })
  cartToken!: string;
}
