import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '#app/modules/authenticated/decorators/public.decorator';
import { CartDto } from '#app/modules/storefront/cart/dto/cart-response.dto';
import { StorefrontAddressService } from './address.service';
import {
  AssignCartAddressDto,
  CreateStorefrontAddressDto,
  UpdateStorefrontAddressDto,
} from './dto/address-input.dto';
import { StorefrontAddressDto } from './dto/address-response.dto';

@Public()
@ApiTags('Storefront Addresses')
@ApiHeader({ name: 'X-Cart-Token', required: true })
@ApiUnauthorizedResponse({ description: 'Missing or invalid cart token' })
@Controller('storefront/:merchantSlug/cart/:cartId/addresses')
export class StorefrontAddressController {
  constructor(private readonly addresses: StorefrontAddressService) {}

  @Get()
  @ApiOperation({
    summary: "List the shopper's saved addresses",
    description:
      'Empty until the cart has contact details and a first address is saved.',
  })
  @ApiOkResponse({ type: [StorefrontAddressDto] })
  findAll(
    @Param('merchantSlug') merchantSlug: string,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Headers('x-cart-token') token?: string,
  ) {
    return this.addresses.findAll(merchantSlug, cartId, token);
  }

  @Post()
  @ApiOperation({ summary: 'Save an address to the shopper address book' })
  @ApiCreatedResponse({ type: StorefrontAddressDto })
  @ApiBadRequestResponse({
    description: 'Cart has no contact name plus email or phone yet',
  })
  create(
    @Param('merchantSlug') merchantSlug: string,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Body() dto: CreateStorefrontAddressDto,
    @Headers('x-cart-token') token?: string,
  ) {
    return this.addresses.create(merchantSlug, cartId, token, dto);
  }

  @Patch(':addressId')
  @ApiOperation({ summary: 'Update a saved address' })
  @ApiOkResponse({ type: StorefrontAddressDto })
  @ApiNotFoundResponse({ description: 'Address not found' })
  update(
    @Param('merchantSlug') merchantSlug: string,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @Body() dto: UpdateStorefrontAddressDto,
    @Headers('x-cart-token') token?: string,
  ) {
    return this.addresses.update(merchantSlug, cartId, token, addressId, dto);
  }

  @Delete(':addressId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a saved address',
    description:
      'Past orders keep their own address snapshot and are unaffected.',
  })
  @ApiOkResponse({ description: 'Address deleted' })
  @ApiNotFoundResponse({ description: 'Address not found' })
  remove(
    @Param('merchantSlug') merchantSlug: string,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @Headers('x-cart-token') token?: string,
  ) {
    return this.addresses.remove(merchantSlug, cartId, token, addressId);
  }

  @Patch(':addressId/assign')
  @ApiOperation({
    summary: 'Use this address as the cart shipping or billing address',
    description:
      'Setting a shipping address clears any delivery selection, since the chosen method may not serve the new destination.',
  })
  @ApiOkResponse({ type: CartDto })
  @ApiNotFoundResponse({ description: 'Address not found' })
  assign(
    @Param('merchantSlug') merchantSlug: string,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @Body() dto: AssignCartAddressDto,
    @Headers('x-cart-token') token?: string,
  ) {
    return this.addresses.assignToCart(
      merchantSlug,
      cartId,
      token,
      addressId,
      dto,
    );
  }
}
