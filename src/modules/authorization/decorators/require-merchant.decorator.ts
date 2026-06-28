import { SetMetadata } from '@nestjs/common';

export const REQUIRE_MERCHANT_KEY = 'requireMerchant';
export const RequireMerchant = () => SetMetadata(REQUIRE_MERCHANT_KEY, true);
