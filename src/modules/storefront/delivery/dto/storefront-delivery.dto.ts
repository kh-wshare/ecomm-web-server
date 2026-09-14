import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class QuoteDeliveryDto {
  @ApiPropertyOptional({ example: 'KH', description: 'ISO 3166-1 alpha-2' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @ApiPropertyOptional({ example: 'Phnom Penh' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @ApiPropertyOptional({ example: 'Phnom Penh' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: '12000' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({
    example: '49.99',
    default: '0',
    description: 'Cart subtotal, for free-shipping and min/max zone thresholds',
  })
  @IsOptional()
  @IsNumberString({ no_symbols: false })
  subtotal?: string;

  @ApiPropertyOptional({ default: 1, minimum: 0, maximum: 10000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  itemCount?: number;
}

export class TrackOrderQueryDto {
  @ApiProperty({
    format: 'email',
    description: 'Must match the email the order was placed with',
  })
  @IsEmail()
  @MaxLength(254)
  customerEmail!: string;
}
