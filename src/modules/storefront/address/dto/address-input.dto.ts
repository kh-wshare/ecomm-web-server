import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { AddressType } from '#app/generated/prisma/enums';
import { AddressInputDto } from '#app/modules/logistics/dto/address.dto';

export class CreateStorefrontAddressDto extends AddressInputDto {
  @ApiPropertyOptional({
    default: false,
    description: "Use as the shopper's default shipping address",
  })
  @IsOptional()
  @IsBoolean()
  isDefaultShipping?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefaultBilling?: boolean;
}

export class UpdateStorefrontAddressDto extends PartialType(
  CreateStorefrontAddressDto,
) {}

export class AssignCartAddressDto {
  @ApiProperty({
    enum: AddressType,
    description: 'Which slot on the cart this address fills',
  })
  @IsEnum(AddressType)
  type!: AddressType;
}
