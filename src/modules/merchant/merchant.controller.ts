import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentMerchant } from '#app/modules/authenticated/decorators/current-merchant.decorator';
import { RequireMerchant } from '#app/modules/authorization/decorators/require-merchant.decorator';
import { RequirePermission } from '#app/modules/authorization/decorators/require-permission.decorator';
import { MerchantService } from './merchant.service';

type CurrentMerchantContext = {
  id: string;
  name: string;
  role: string;
  permissions: string[];
};

@ApiTags('Merchant')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Merchant-ID', required: false })
@RequireMerchant()
@Controller('merchant')
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  @Get()
  @RequirePermission('merchant.read')
  @ApiOperation({ summary: 'Get the active merchant profile' })
  findCurrent(@CurrentMerchant() merchant: CurrentMerchantContext) {
    return this.merchantService.findCurrent(merchant.id);
  }
}
