import { Module } from '@nestjs/common';
import { AddressModule } from '#app/modules/address/address.module';
import { PosAddressesController } from './addresses/pos-addresses.controller';
import { PosAddressesService } from './addresses/pos-addresses.service';
import { PosCustomersController } from './customers.controller';
import { PosCustomersService } from './customers.service';

@Module({
  imports: [AddressModule],
  controllers: [PosCustomersController, PosAddressesController],
  providers: [PosCustomersService, PosAddressesService],
  exports: [PosCustomersService],
})
export class PosCustomersModule {}
