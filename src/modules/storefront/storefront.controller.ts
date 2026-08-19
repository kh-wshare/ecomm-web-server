import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '#app/modules/authenticated/decorators/public.decorator';
import { StorefrontProductQueryDto } from './dto/storefront-query.dto';
import {
  LiveThemeDto,
  PublicProductDto,
  PublicStorefrontDto,
} from './dto/storefront-response.dto';
import { StorefrontService } from './storefront.service';

@Public()
@ApiTags('Storefront')
@Controller('storefront/:merchantSlug')
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get()
  @ApiOperation({ summary: 'Get public storefront data' })
  @ApiOkResponse({ type: PublicStorefrontDto })
  getStorefront(@Param('merchantSlug') merchantSlug: string) {
    return this.storefrontService.getStorefront(merchantSlug);
  }

  @Get('products')
  @ApiOperation({ summary: 'List publicly visible products' })
  @ApiOkResponse({ type: [PublicProductDto] })
  listProducts(
    @Param('merchantSlug') merchantSlug: string,
    @Query() query: StorefrontProductQueryDto,
  ) {
    return this.storefrontService.listProducts(merchantSlug, query);
  }

  @Get('products/:productSlug')
  @ApiOperation({ summary: 'Get a publicly visible product' })
  @ApiOkResponse({ type: PublicProductDto })
  getProduct(
    @Param('merchantSlug') merchantSlug: string,
    @Param('productSlug') productSlug: string,
    @Query() query: StorefrontProductQueryDto,
  ) {
    return this.storefrontService.getProduct(
      merchantSlug,
      productSlug,
      query.channel,
    );
  }

  @Get('theme')
  @ApiOperation({ summary: 'Get the live storefront theme' })
  @ApiOkResponse({ type: LiveThemeDto })
  getTheme(@Param('merchantSlug') merchantSlug: string) {
    return this.storefrontService.getTheme(merchantSlug);
  }
}
