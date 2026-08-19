import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  InventoryMovementType,
  InventoryReservationStatus,
  ProductType,
} from '#app/generated/prisma/enums';

export class InventoryStockDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  merchantId!: string;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  variantId!: string | null;

  @ApiProperty()
  totalStock!: number;

  @ApiProperty()
  reservedStock!: number;

  @ApiProperty()
  soldStock!: number;

  @ApiProperty()
  safetyBuffer!: number;

  @ApiProperty()
  availableStock!: number;

  @ApiProperty()
  onlineSellableStock!: number;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class InventoryReservationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  inventoryStockId!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty({ enum: InventoryReservationStatus })
  status!: InventoryReservationStatus;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: Date;
}

export class InventoryMovementDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: InventoryMovementType })
  type!: InventoryMovementType;

  @ApiProperty()
  quantity!: number;

  @ApiPropertyOptional({ nullable: true })
  referenceId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  referenceType!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}

export class InventoryOperationDto {
  @ApiProperty({ type: InventoryStockDto })
  stock!: InventoryStockDto;

  @ApiPropertyOptional({ type: InventoryReservationDto })
  reservation?: InventoryReservationDto;
}

export class ProductInventoryDetailDto {
  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty({ enum: ProductType })
  productType!: ProductType;

  @ApiProperty({ type: [InventoryStockDto] })
  stocks!: InventoryStockDto[];

  @ApiProperty({ type: [InventoryReservationDto] })
  activeReservations!: InventoryReservationDto[];

  @ApiProperty({ type: [InventoryMovementDto] })
  recentMovements!: InventoryMovementDto[];
}
