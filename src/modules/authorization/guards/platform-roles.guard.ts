import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformRole } from '#app/generated/prisma/enums';
import { AuthenticatedUser } from '#app/modules/authenticated/interfaces/authenticated-user.interface';
import { PLATFORM_ROLES_KEY } from '../decorators/platform-roles.decorator';

@Injectable()
export class PlatformRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PlatformRole[]>(
      PLATFORM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const user = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>().user;
    if (!user || !required.includes(user.platformRole)) {
      throw new ForbiddenException('Platform administrator access required');
    }
    return true;
  }
}
