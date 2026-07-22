import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderDto } from '#app/modules/order/dto/order-response.dto';
import { POS_PAYMENT_METHODS } from './pos-sale-input.dto';
import type { PosPaymentMethod } from './pos-sale-input.dto';

export class PosReceiptItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  variantId!: string | null;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  sku!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unitPrice!: number;

  @ApiProperty()
  note!: string;
}

export class PosReceiptDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  orderNumber!: string;

  @ApiProperty()
  branchName!: string;

  @ApiProperty()
  cashierName!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  customerName!: string;

  @ApiProperty({ type: [PosReceiptItemDto] })
  items!: PosReceiptItemDto[];

  @ApiProperty()
  subtotal!: number;

  @ApiProperty()
  discount!: number;

  @ApiProperty()
  serviceCharge!: number;

  @ApiProperty()
  tax!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty({ enum: POS_PAYMENT_METHODS })
  paymentMethod!: PosPaymentMethod;

  @ApiProperty()
  cashReceived!: number;

  @ApiProperty()
  changeDue!: number;
}

export class PosSaleResponseDto {
  @ApiProperty({ type: OrderDto })
  order!: OrderDto;

  @ApiProperty({ type: PosReceiptDto })
  receipt!: PosReceiptDto;
}
