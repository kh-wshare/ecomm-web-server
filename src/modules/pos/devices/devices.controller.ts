import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentMerchant } from '#app/modules/authenticated/decorators/current-merchant.decorator';
import { CurrentUser } from '#app/modules/authenticated/decorators/current-user.decorator';
import type { AuthenticatedUser } from '#app/modules/authenticated/interfaces/authenticated-user.interface';
import { RequireMerchant } from '#app/modules/authorization/decorators/require-merchant.decorator';
import { RequirePermission } from '#app/modules/authorization/decorators/require-permission.decorator';
import { PosDevicesService } from './devices.service';
import {
  PosDeviceQueryDto,
  RegisterPosDeviceDto,
} from './dto/device-input.dto';
import { PosDeviceDto } from './dto/device-response.dto';

type CurrentMerchantContext = { id: string };

@ApiTags('POS Devices')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Merchant-ID', required: false })
@RequireMerchant()
@Controller('pos/devices')
export class PosDevicesController {
  constructor(private readonly devices: PosDevicesService) {}

  @Get()
  @RequirePermission('pos.device.manage')
  @ApiOperation({ summary: 'List registered POS devices' })
  @ApiOkResponse({ type: [PosDeviceDto] })
  findAll(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Query() query: PosDeviceQueryDto,
  ) {
    return this.devices.findAll(merchant.id, query);
  }

  @Post()
  @RequirePermission('pos.device.manage')
  @ApiOperation({ summary: 'Register (or re-register) a POS device' })
  @ApiCreatedResponse({ type: PosDeviceDto })
  register(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterPosDeviceDto,
    @Req() request: Request,
  ) {
    return this.devices.register(merchant.id, user.id, dto, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });
  }
}
