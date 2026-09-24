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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '#app/modules/authenticated/decorators/current-user.decorator';
import { Public } from '#app/modules/authenticated/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '#app/modules/authenticated/guards/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '#app/modules/authenticated/interfaces/authenticated-user.interface';
import { CartDto } from '#app/modules/storefront/cart/dto/cart-response.dto';
import {
  AssignCartAddressDto,
  CreateAddressDto,
  UpdateAddressDto,
} from '#app/modules/address/dto/address-input.dto';
import {
  AddressResponseDto,
  DeletedAddressDto,
} from '#app/modules/address/dto/address-response.dto';
import {
  CurrentStorefrontMerchant,
  StorefrontScoped,
} from '#app/modules/storefront/context/current-storefront-merchant.decorator';
import { GuestAddressService } from './guest-address.service';

@Public()
@UseGuards(OptionalJwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Cart')
@ApiUnauthorizedResponse({ description: 'Missing or invalid cart token' })
@StorefrontScoped()
@Controller('storefront/cart/:cartId/addresses')
export class GuestAddressController {
  constructor(private readonly addresses: GuestAddressService) {}

  @Get()
  @ApiOperation({
    summary: "List the shopper's saved addresses",
    description:
      'Empty until the cart has contact details and a first address is saved.',
  })
  @ApiOkResponse({ type: [AddressResponseDto] })
  findAll(
    @CurrentStorefrontMerchant('id') merchantId: string,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Headers('X-Cart-Token') token?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.addresses.findAll(merchantId, cartId, token, user);
  }

  @Post()
  @ApiOperation({ summary: 'Save an address to the shopper address book' })
  @ApiCreatedResponse({ type: AddressResponseDto })
  @ApiBadRequestResponse({
    description: 'Cart has no contact name plus email or phone yet',
  })
  create(
    @CurrentStorefrontMerchant('id') merchantId: string,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Body() dto: CreateAddressDto,
    @Headers('X-Cart-Token') token?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.addresses.create(merchantId, cartId, token, dto, user);
  }

  @Patch(':addressId')
  @ApiOperation({ summary: 'Update a saved address' })
  @ApiOkResponse({ type: AddressResponseDto })
  @ApiNotFoundResponse({ description: 'Address not found' })
  update(
    @CurrentStorefrontMerchant('id') merchantId: string,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @Body() dto: UpdateAddressDto,
    @Headers('X-Cart-Token') token?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.addresses.update(
      merchantId,
      cartId,
      token,
      addressId,
      dto,
      user,
    );
  }

  @Delete(':addressId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a saved address',
    description:
      'Past orders keep their own address snapshot and are unaffected.',
  })
  @ApiOkResponse({ type: DeletedAddressDto })
  @ApiNotFoundResponse({ description: 'Address not found' })
  remove(
    @CurrentStorefrontMerchant('id') merchantId: string,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @Headers('X-Cart-Token') token?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.addresses.remove(merchantId, cartId, token, addressId, user);
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
    @CurrentStorefrontMerchant('id') merchantId: string,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @Body() dto: AssignCartAddressDto,
    @Headers('X-Cart-Token') token?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.addresses.assignToCart(
      merchantId,
      cartId,
      token,
      addressId,
      dto,
      user,
    );
  }
}
