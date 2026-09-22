import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CartItemInputDto } from '#app/modules/storefront/cart/dto/cart-input.dto';

export class CreatePosCartDto {
  @ApiPropertyOptional({
    type: [CartItemInputDto],
    description: 'Optional seed lines, so a cart can be created pre-filled',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CartItemInputDto)
  items?: CartItemInputDto[];
}

export class UpdatePosCartContactDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerName?: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  customerPhone?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CheckoutPosCartDto {
  @ApiProperty({
    example: 'POS-DEVICE-001',
    description:
      'The register ringing the cart up; its branch and open shift are used',
  })
  @IsString()
  deviceId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  tableId?: string;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountAmount?: number;
}
