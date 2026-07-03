import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  NotEquals,
} from 'class-validator';
import { SalesChannel } from '#app/generated/prisma/enums';
import { IsEnum } from 'class-validator';

export class InventoryTargetDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  variantId?: string;
}

export class AdjustInventoryDto extends InventoryTargetDto {
  @ApiProperty({
    example: 10,
    description: 'Signed change applied to total stock',
  })
  @Type(() => Number)
  @IsInt()
  @NotEquals(0)
  quantityDelta!: number;

  @ApiPropertyOptional({ example: 2, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  safetyBuffer?: number;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @IsOptional()
  referenceId?: string;

  @ApiPropertyOptional({ maxLength: 80, example: 'purchase_order' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @IsOptional()
  referenceType?: string;
}

export class ReserveInventoryDto extends InventoryTargetDto {
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  checkoutSessionId!: string;

  @ApiProperty({ enum: SalesChannel })
  @IsEnum(SalesChannel)
  channel!: SalesChannel;

  @ApiPropertyOptional({ default: 15, minimum: 1, maximum: 120 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  @IsOptional()
  expiresInMinutes?: number = 15;
}

export class ReleaseInventoryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  reservationId!: string;
}

export class ConfirmInventoryDto extends ReleaseInventoryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  orderId?: string;
}
