import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShipmentStatus } from '#app/generated/prisma/enums';

export class ShipmentItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  orderItemId!: string;

  @ApiProperty()
  quantity!: number;
}

export class ShipmentEventDto {
  @ApiProperty({ enum: ShipmentStatus })
  status!: ShipmentStatus;

  @ApiPropertyOptional({ nullable: true })
  message!: string | null;

  @ApiPropertyOptional({ nullable: true })
  location!: string | null;

  @ApiProperty()
  occurredAt!: Date;
}

export class ShipmentDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  orderId!: string;

  @ApiProperty({ example: 'SHP-20260915-A1B2C3D4E5' })
  shipmentNumber!: string;

  @ApiProperty({ enum: ShipmentStatus })
  status!: ShipmentStatus;

  @ApiPropertyOptional({ nullable: true })
  carrierName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  trackingNumber!: string | null;

  @ApiPropertyOptional({ nullable: true })
  trackingUrl!: string | null;

  @ApiPropertyOptional({ nullable: true })
  shippedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  deliveredAt!: Date | null;

  @ApiProperty({ type: [ShipmentItemDto] })
  items!: ShipmentItemDto[];

  @ApiProperty({ type: [ShipmentEventDto] })
  events!: ShipmentEventDto[];
}
