import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AddressDto } from '#app/modules/logistics/dto/address.dto';

/** One saved address, as every address surface returns it. */
export class AddressResponseDto extends AddressDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  customerId!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description:
      'The signed-in shopper who owns this address. Null for a walk-in customer, who has no account.',
  })
  ownerId!: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'The staff member who saved it on the customer behalf, if any',
  })
  createdById!: string | null;

  @ApiProperty()
  isDefaultShipping!: boolean;

  @ApiProperty()
  isDefaultBilling!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class DeletedAddressDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: true })
  deleted!: boolean;
}
