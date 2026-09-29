import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentMerchant } from '#app/modules/authenticated/decorators/current-merchant.decorator';
import { CurrentUser } from '#app/modules/authenticated/decorators/current-user.decorator';
import type { AuthenticatedUser } from '#app/modules/authenticated/interfaces/authenticated-user.interface';
import { RequireMerchant } from '#app/modules/authorization/decorators/require-merchant.decorator';
import { RequirePermission } from '#app/modules/authorization/decorators/require-permission.decorator';
import {
  CreateReportExportDto,
  ReportExportResponseDto,
} from './dto/report-export.dto';
import { ReportExportService } from './report-export.service';

type CurrentMerchantContext = { id: string };

@ApiTags('Reports')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Merchant-ID', required: false })
@RequireMerchant()
@RequirePermission('report.export')
@Controller('reports/exports')
export class ReportExportController {
  constructor(private readonly exports: ReportExportService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a CSV export of a merchant report' })
  @ApiOkResponse({ type: ReportExportResponseDto })
  create(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReportExportDto,
  ) {
    return this.exports.create(merchant.id, user.id, dto);
  }

  @Get(':exportId')
  @ApiOperation({
    summary: 'Get the status and download link of a report export',
  })
  @ApiOkResponse({ type: ReportExportResponseDto })
  findOne(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Param('exportId', ParseUUIDPipe) exportId: string,
  ) {
    return this.exports.findOne(merchant.id, exportId);
  }
}
