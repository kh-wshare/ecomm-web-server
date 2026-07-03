import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateMerchantDto {
  @ApiPropertyOptional({ example: 'Acme Store', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @Matches(/\S/, { message: 'name must contain a non-whitespace character' })
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    example: 'acme-store',
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    maxLength: 120,
  })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must contain lowercase letters, numbers, and hyphens only',
  })
  slug?: string;

  @ApiPropertyOptional({ example: 'store@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+15551234567', maxLength: 40 })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({
    default: true,
    description: 'Return sold inventory when a paid order is refunded',
  })
  @IsBoolean()
  @IsOptional()
  returnStockOnRefund?: boolean;
}
