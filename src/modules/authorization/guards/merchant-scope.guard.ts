import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '#app/modules/authenticated/interfaces/authenticated-user.interface';
import { REQUIRE_MERCHANT_KEY } from '../decorators/require-merchant.decorator';

@Injectable()
export class MerchantScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_MERCHANT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      headers: Record<string, string | string[] | undefined>;
    }>();
    if (!request.user?.merchantId) {
      throw new ForbiddenException('An active merchant context is required');
    }

    const header = request.headers['x-merchant-id'];
    const requestedMerchant = Array.isArray(header) ? header[0] : header;
    if (requestedMerchant && requestedMerchant !== request.user.merchantId) {
      throw new ForbiddenException('Merchant context does not match token');
    }
    return true;
  }
}
