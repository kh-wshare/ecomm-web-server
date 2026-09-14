import { ApiProperty } from '@nestjs/swagger';
import { AddressDto } from '#app/modules/logistics/dto/address.dto';

export class StorefrontAddressDto extends AddressDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  customerId!: string;

  @ApiProperty()
  isDefaultShipping!: boolean;

  @ApiProperty()
  isDefaultBilling!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
