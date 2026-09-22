import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentMerchant } from '#app/modules/authenticated/decorators/current-merchant.decorator';
import { CurrentUser } from '#app/modules/authenticated/decorators/current-user.decorator';
import type { AuthenticatedUser } from '#app/modules/authenticated/interfaces/authenticated-user.interface';
import { RequireMerchant } from '#app/modules/authorization/decorators/require-merchant.decorator';
import { RequirePermission } from '#app/modules/authorization/decorators/require-permission.decorator';
import { CreateAddressDto } from '#app/modules/address/dto/address-input.dto';
import { AddressResponseDto } from '#app/modules/address/dto/address-response.dto';
import { PosAddressQueryDto } from './dto/pos-address-query.dto';
import { PosAddressesService } from './pos-addresses.service';

type CurrentMerchantContext = { id: string };

@ApiTags('POS Customer Addresses')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Merchant-ID', required: false })
@RequireMerchant()
@Controller('pos')
export class PosAddressesController {
  constructor(private readonly addresses: PosAddressesService) {}

  @Post('customers/:customerId/addresses')
  @RequirePermission('pos.customer.manage')
  @ApiOperation({ summary: 'Save an address for a POS customer' })
  @ApiCreatedResponse({ type: AddressResponseDto })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  create(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.addresses.create(merchant.id, customerId, user.id, dto);
  }

  @Get('addresses')
  @RequirePermission('pos.customer.manage')
  @ApiOperation({
    summary: 'List addresses saved by the current staff member',
    description:
      'Scoped to the authenticated staff user; there is no owner filter.',
  })
  @ApiOkResponse()
  findAllByCreator(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PosAddressQueryDto,
  ) {
    return this.addresses.findAllByCreator(merchant.id, user.id, query);
  }
}
