import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { AddressType } from '#app/generated/prisma/enums';
import { AddressInputDto } from '#app/modules/logistics/dto/address.dto';

/**
 * Saving an address, on any surface. The postal fields come from
 * `AddressInputDto` (shared with delivery quoting and the order snapshot, so a
 * zone matched at quote time is matched against the fields an order records);
 * the two default flags are what an address *book* adds on top.
 *
 * One DTO for all three surfaces on purpose: a shopper, a signed-in account
 * and a staff member type the same address. Only who may save it differs, and
 * that is a controller concern, not a shape concern.
 */
export class CreateAddressDto extends AddressInputDto {
  @ApiPropertyOptional({
    description:
      "Use as the customer's default shipping address. Omitted on their first address means yes.",
  })
  @IsOptional()
  @IsBoolean()
  isDefaultShipping?: boolean;

  @ApiPropertyOptional({
    description: "Use as the customer's default billing address.",
  })
  @IsOptional()
  @IsBoolean()
  isDefaultBilling?: boolean;
}

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}

export class AssignCartAddressDto {
  @ApiProperty({
    enum: AddressType,
    description: 'Which slot on the cart this address fills',
  })
  @IsEnum(AddressType)
  type!: AddressType;
}
