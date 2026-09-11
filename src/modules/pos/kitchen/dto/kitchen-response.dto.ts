import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KitchenOrderStatus } from '#app/generated/prisma/enums';

export class KitchenOrderItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  orderItemId!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty({ enum: KitchenOrderStatus })
  status!: KitchenOrderStatus;

  @ApiPropertyOptional({ nullable: true })
  note!: string | null;
}

export class KitchenOrderDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  orderId!: string;

  @ApiPropertyOptional({ nullable: true })
  tableId!: string | null;

  @ApiProperty({ enum: KitchenOrderStatus })
  status!: KitchenOrderStatus;

  @ApiProperty()
  sentAt!: Date;

  @ApiProperty({ type: [KitchenOrderItemDto] })
  items!: KitchenOrderItemDto[];
}
