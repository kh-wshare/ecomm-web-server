import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { CurrentMerchant } from '#app/modules/authenticated/decorators/current-merchant.decorator';
import { CurrentUser } from '#app/modules/authenticated/decorators/current-user.decorator';
import type { AuthenticatedUser } from '#app/modules/authenticated/interfaces/authenticated-user.interface';
import { RequireMerchant } from '#app/modules/authorization/decorators/require-merchant.decorator';
import { RequirePermission } from '#app/modules/authorization/decorators/require-permission.decorator';
import {
  CreatePosTableDto,
  PosTableQueryDto,
  UpdatePosTableDto,
} from './dto/table-input.dto';
import { PosTablesService } from './tables.service';

type CurrentMerchantContext = { id: string };

@ApiTags('POS Tables')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Merchant-ID', required: false })
@RequireMerchant()
@Controller('pos/tables')
export class PosTablesController {
  constructor(private readonly tables: PosTablesService) {}

  @Get()
  @RequirePermission('pos.table.manage')
  @ApiOperation({ summary: 'List tables' })
  @ApiOkResponse()
  findAll(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Query() query: PosTableQueryDto,
  ) {
    return this.tables.findAll(merchant.id, query);
  }

  @Post()
  @RequirePermission('pos.table.manage')
  @ApiOperation({ summary: 'Create a table' })
  @ApiCreatedResponse()
  create(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePosTableDto,
    @Req() request: Request,
  ) {
    return this.tables.create(
      merchant.id,
      user.id,
      dto,
      this.metadata(request),
    );
  }

  @Patch(':tableId')
  @RequirePermission('pos.table.manage')
  @ApiOperation({ summary: 'Update a table (status/seats)' })
  @ApiOkResponse()
  update(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('tableId', ParseUUIDPipe) tableId: string,
    @Body() dto: UpdatePosTableDto,
    @Req() request: Request,
  ) {
    return this.tables.update(
      merchant.id,
      user.id,
      tableId,
      dto,
      this.metadata(request),
    );
  }

  private metadata(request: Request) {
    return { ipAddress: request.ip, userAgent: request.get('user-agent') };
  }
}
