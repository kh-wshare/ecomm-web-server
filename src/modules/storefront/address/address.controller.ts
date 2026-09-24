import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '#app/modules/authenticated/decorators/current-user.decorator';
import type { AuthenticatedUser } from '#app/modules/authenticated/interfaces/authenticated-user.interface';
import {
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
import { StorefrontAddressService } from './address.service';

@ApiTags('Addresses')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
@StorefrontScoped()
@Controller('storefront/addresses')
export class StorefrontAddressController {
  constructor(private readonly addresses: StorefrontAddressService) {}

  @Get()
  @ApiOperation({ summary: "List the signed-in shopper's saved addresses" })
  @ApiOkResponse({ type: [AddressResponseDto] })
  findAll(
    @CurrentStorefrontMerchant('id') merchantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.addresses.findAll(merchantId, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Save an address without going through a cart' })
  @ApiCreatedResponse({ type: AddressResponseDto })
  create(
    @CurrentStorefrontMerchant('id') merchantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAddressDto,
  ) {
    return this.addresses.create(merchantId, user, dto);
  }

  @Patch(':addressId')
  @ApiOperation({ summary: 'Update one of the shopper’s saved addresses' })
  @ApiOkResponse({ type: AddressResponseDto })
  @ApiNotFoundResponse({ description: 'Address not found' })
  update(
    @CurrentStorefrontMerchant('id') merchantId: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addresses.update(merchantId, user.id, addressId, dto);
  }

  @Delete(':addressId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete one of the shopper’s saved addresses',
    description:
      'Past orders keep their own address snapshot and are unaffected.',
  })
  @ApiOkResponse({ type: DeletedAddressDto })
  @ApiNotFoundResponse({ description: 'Address not found' })
  remove(
    @CurrentStorefrontMerchant('id') merchantId: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.addresses.remove(merchantId, user.id, addressId);
  }
}
