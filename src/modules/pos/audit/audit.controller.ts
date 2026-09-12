import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentMerchant } from '#app/modules/authenticated/decorators/current-merchant.decorator';
import { RequireMerchant } from '#app/modules/authorization/decorators/require-merchant.decorator';
import { RequirePermission } from '#app/modules/authorization/decorators/require-permission.decorator';
import { PosAuditService } from './audit.service';
import { PosAuditQueryDto } from './dto/audit-query.dto';

type CurrentMerchantContext = { id: string };

@ApiTags('POS Audit')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Merchant-ID', required: false })
@RequireMerchant()
@Controller('pos/audit-logs')
export class PosAuditController {
  constructor(private readonly audit: PosAuditService) {}

  @Get()
  @RequirePermission('pos.audit.read')
  @ApiOperation({ summary: 'List POS audit log entries' })
  @ApiOkResponse()
  findAll(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Query() query: PosAuditQueryDto,
  ) {
    return this.audit.findAll(merchant.id, query);
  }
}
