import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { BaseQueryDto } from '#app/common/dto/base-query.dto';
import { ShipmentStatus } from '#app/generated/prisma/enums';
import { AddressInputDto } from './address.dto';

export class ShipmentItemInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  orderItemId!: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  quantity!: number;
}

export class CreateShipmentDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: "Defaults to the order's delivery method",
  })
  @IsOptional()
  @IsUUID()
  deliveryMethodId?: string;

  @ApiPropertyOptional({ maxLength: 120, example: 'J&T Express' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  carrierName?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  trackingNumber?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  trackingUrl?: string;

  @ApiPropertyOptional({
    type: AddressInputDto,
    description: "Defaults to the order's shipping address snapshot",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressInputDto)
  address?: AddressInputDto;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({
    type: [ShipmentItemInputDto],
    description:
      'Defaults to every not-yet-shipped unit on the order when omitted',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ShipmentItemInputDto)
  items?: ShipmentItemInputDto[];
}

export class UpdateShipmentDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  carrierName?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  trackingNumber?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  trackingUrl?: string;

  @ApiPropertyOptional({ type: AddressInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressInputDto)
  address?: AddressInputDto;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateShipmentStatusDto {
  @ApiProperty({ enum: ShipmentStatus })
  @IsEnum(ShipmentStatus)
  status!: ShipmentStatus;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({
    description: 'When the event happened; defaults to now',
  })
  @IsOptional()
  @IsISO8601()
  occurredAt?: string;
}

export class ShipmentQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({ enum: ShipmentStatus })
  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  orderId?: string;
}
