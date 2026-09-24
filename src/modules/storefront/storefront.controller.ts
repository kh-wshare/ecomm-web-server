import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '#app/modules/authenticated/decorators/public.decorator';
import { OrderDto } from '#app/modules/order/dto/order-response.dto';
import {
  StorefrontOrderLookupQueryDto,
  StorefrontOrderQueryDto,
} from './dto/storefront-order-query.dto';
import { StorefrontProductQueryDto } from './dto/storefront-query.dto';
import {
  LiveThemeDto,
  PublicProductDto,
  PublicStorefrontDto,
} from './dto/storefront-response.dto';
import {
  CurrentStorefrontMerchant,
  StorefrontScoped,
} from './context/current-storefront-merchant.decorator';
import type { StorefrontMerchant } from './context/storefront-context.service';
import { StorefrontService } from './storefront.service';

@Public()
@ApiTags('Storefront')
@StorefrontScoped()
@Controller('storefront')
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get()
  @ApiOperation({ summary: 'Get public storefront data' })
  @ApiOkResponse({ type: PublicStorefrontDto })
  getStorefront(@CurrentStorefrontMerchant() merchant: StorefrontMerchant) {
    return this.storefrontService.getStorefront(merchant);
  }

  @Get('products')
  @ApiOperation({ summary: 'List publicly visible products' })
  @ApiOkResponse({ type: [PublicProductDto] })
  listProducts(
    @CurrentStorefrontMerchant('id') merchantId: string,
    @Query() query: StorefrontProductQueryDto,
  ) {
    return this.storefrontService.listProducts(merchantId, query);
  }

  @Get('products/:productSlug')
  @ApiOperation({ summary: 'Get a publicly visible product' })
  @ApiOkResponse({ type: PublicProductDto })
  getProduct(
    @CurrentStorefrontMerchant('id') merchantId: string,
    @Param('productSlug') productSlug: string,
    @Query() query: StorefrontProductQueryDto,
  ) {
    return this.storefrontService.getProduct(
      merchantId,
      productSlug,
      query.channel,
    );
  }

  @Get('theme')
  @ApiOperation({ summary: 'Get the live storefront theme' })
  @ApiOkResponse({ type: LiveThemeDto })
  getTheme(@CurrentStorefrontMerchant('id') merchantId: string) {
    return this.storefrontService.getTheme(merchantId);
  }

  @Get('orders')
  @ApiOperation({
    summary: "List a customer's orders by email, optionally filtered by status",
  })
  @ApiOkResponse({ type: [OrderDto] })
  listOrders(
    @CurrentStorefrontMerchant('id') merchantId: string,
    @Query() query: StorefrontOrderQueryDto,
  ) {
    return this.storefrontService.listOrders(merchantId, query);
  }

  @Get('orders/:orderNumber')
  @ApiOperation({
    summary:
      'Get order detail by order number, verified against the customer email',
  })
  @ApiOkResponse({ type: OrderDto })
  getOrder(
    @CurrentStorefrontMerchant('id') merchantId: string,
    @Param('orderNumber') orderNumber: string,
    @Query() query: StorefrontOrderLookupQueryDto,
  ) {
    return this.storefrontService.getOrder(
      merchantId,
      orderNumber,
      query.customerEmail,
    );
  }
}
