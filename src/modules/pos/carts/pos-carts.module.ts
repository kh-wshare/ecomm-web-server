import { Module } from '@nestjs/common';
import { PosOrdersModule } from '#app/modules/pos/orders/pos-orders.module';
import { CartModule } from '#app/modules/storefront/cart/cart.module';
import { PosCartsController } from './pos-carts.controller';
import { PosCartsService } from './pos-carts.service';

@Module({
  imports: [CartModule, PosOrdersModule],
  controllers: [PosCartsController],
  providers: [PosCartsService],
})
export class PosCartsModule {}
