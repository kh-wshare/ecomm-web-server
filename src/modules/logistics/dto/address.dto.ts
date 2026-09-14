import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

/**
 * The postal shape shared by every address surface: the storefront address
 * book, a cart's shipping/billing selection, the JSON snapshot written onto an
 * order, and a shipment's delivery address. Defined once here so a zone
 * matched at quote time is matched against exactly the fields an order
 * eventually records.
 */
export class AddressInputDto {
  @ApiPropertyOptional({ maxLength: 60, example: 'Home' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string;

  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MaxLength(120)
  recipientName!: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ format: 'email' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiProperty({ maxLength: 200, example: '12 Street 240' })
  @IsString()
  @MaxLength(200)
  line1!: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @ApiPropertyOptional({ maxLength: 100, example: 'Phnom Penh' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiProperty({ example: 'KH', description: 'ISO 3166-1 alpha-2 code' })
  @IsString()
  @Length(2, 2)
  country!: string;

  @ApiPropertyOptional({ example: 11.5564 })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: 104.9282 })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class AddressDto {
  @ApiPropertyOptional({ nullable: true })
  label!: string | null;

  @ApiProperty()
  recipientName!: string;

  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;

  @ApiPropertyOptional({ nullable: true })
  email!: string | null;

  @ApiProperty()
  line1!: string;

  @ApiPropertyOptional({ nullable: true })
  line2!: string | null;

  @ApiPropertyOptional({ nullable: true })
  city!: string | null;

  @ApiPropertyOptional({ nullable: true })
  province!: string | null;

  @ApiPropertyOptional({ nullable: true })
  postalCode!: string | null;

  @ApiProperty({ example: 'KH' })
  country!: string;

  @ApiPropertyOptional({ nullable: true, example: '11.5564000' })
  latitude!: string | null;

  @ApiPropertyOptional({ nullable: true, example: '104.9282000' })
  longitude!: string | null;

  @ApiPropertyOptional({ nullable: true })
  note!: string | null;
}
