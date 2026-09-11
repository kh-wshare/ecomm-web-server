import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Idempotent } from '#app/common/decorators/idempotent.decorator';
import { CurrentMerchant } from '#app/modules/authenticated/decorators/current-merchant.decorator';
import { CurrentUser } from '#app/modules/authenticated/decorators/current-user.decorator';
import type { AuthenticatedUser } from '#app/modules/authenticated/interfaces/authenticated-user.interface';
import { RequireMerchant } from '#app/modules/authorization/decorators/require-merchant.decorator';
import { RequirePermission } from '#app/modules/authorization/decorators/require-permission.decorator';
import {
  ClosePosShiftDto,
  CurrentPosShiftQueryDto,
  OpenPosShiftDto,
} from './dto/shift-input.dto';
import { PosShiftDto } from './dto/shift-response.dto';
import { PosShiftsService } from './shifts.service';

type CurrentMerchantContext = { id: string };

@ApiTags('POS Shifts')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Merchant-ID', required: false })
@RequireMerchant()
@Controller('pos/shifts')
export class PosShiftsController {
  constructor(private readonly shifts: PosShiftsService) {}

  @Post()
  @Idempotent('pos.shift.open')
  @RequirePermission('pos.shift.manage')
  @ApiOperation({ summary: 'Open a POS cashier shift' })
  @ApiCreatedResponse({ type: PosShiftDto })
  open(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: OpenPosShiftDto,
    @Req() request: Request,
  ) {
    return this.shifts.open(merchant.id, user.id, dto, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });
  }

  @Get('current')
  @RequirePermission('pos.shift.manage')
  @ApiOperation({ summary: 'Get the current open shift for a device' })
  @ApiOkResponse({ type: PosShiftDto })
  current(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Query() query: CurrentPosShiftQueryDto,
  ) {
    return this.shifts.current(merchant.id, query.deviceId);
  }

  @Post(':shiftId/close')
  @Idempotent('pos.shift.close')
  @RequirePermission('pos.shift.manage')
  @ApiOperation({ summary: 'Close a POS cashier shift and reconcile cash' })
  @ApiOkResponse({ type: PosShiftDto })
  close(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
    @Body() dto: ClosePosShiftDto,
    @Req() request: Request,
  ) {
    return this.shifts.close(merchant.id, user.id, shiftId, dto, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });
  }
}
