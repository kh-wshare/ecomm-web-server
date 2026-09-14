import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DeliveryMethodStatus,
  DeliveryMethodType,
} from '#app/generated/prisma/enums';

export class DeliveryZoneDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: [String], example: ['KH'] })
  countries!: string[];

  @ApiProperty({ type: [String] })
  provinces!: string[];

  @ApiProperty({ type: [String] })
  cities!: string[];

  @ApiProperty({ type: [String] })
  postalCodes!: string[];

  @ApiProperty({ example: '2.50' })
  baseFee!: string;

  @ApiProperty({ example: '0.50' })
  perItemFee!: string;

  @ApiPropertyOptional({ nullable: true, example: '50.00' })
  freeOverSubtotal!: string | null;

  @ApiPropertyOptional({ nullable: true })
  minSubtotal!: string | null;

  @ApiPropertyOptional({ nullable: true })
  maxSubtotal!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 1 })
  estimatedMinDays!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 3 })
  estimatedMaxDays!: number | null;

  @ApiProperty()
  isFallback!: boolean;

  @ApiProperty()
  sortOrder!: number;
}

export class DeliveryMethodDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  merchantId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  branchId!: string | null;

  @ApiProperty()
  name!: string;

  @ApiProperty({ example: 'STANDARD' })
  code!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: DeliveryMethodType })
  type!: DeliveryMethodType;

  @ApiProperty({ enum: DeliveryMethodStatus })
  status!: DeliveryMethodStatus;

  @ApiProperty()
  isDefault!: boolean;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({ type: [DeliveryZoneDto] })
  zones!: DeliveryZoneDto[];
}

/** One selectable delivery option, already priced for a specific cart. */
export class DeliveryOptionDto {
  @ApiProperty({ format: 'uuid' })
  methodId!: string;

  @ApiProperty({ example: 'STANDARD' })
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: DeliveryMethodType })
  type!: DeliveryMethodType;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  branchId!: string | null;

  @ApiProperty()
  isDefault!: boolean;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  zoneId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  zoneName!: string | null;

  @ApiProperty({ example: '2.50' })
  fee!: string;

  @ApiPropertyOptional({ nullable: true })
  estimatedMinDays!: number | null;

  @ApiPropertyOptional({ nullable: true })
  estimatedMaxDays!: number | null;
}
