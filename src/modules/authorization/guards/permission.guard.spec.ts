import { ExecutionContext, ForbiddenException, Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformRole, UserStatus } from '#app/generated/prisma/enums';
import { AuthenticatedUser } from '#app/modules/authenticated/interfaces/authenticated-user.interface';
import { PermissionCode } from '../authorization.constants';
import { PermissionGuard } from './permission.guard';

describe('PermissionGuard', () => {
  const handler = () => undefined;
  class TestController {}

  const user = (permissions: string[]): AuthenticatedUser => ({
    id: 'user-1',
    email: 'owner@example.com',
    fullName: 'Owner',
    status: UserStatus.ACTIVE,
    platformRole: PlatformRole.USER,
    sessionId: 'session-1',
    merchantId: 'merchant-1',
    merchantName: 'Merchant',
    role: 'owner',
    permissions,
  });

  const context = (authenticatedUser?: AuthenticatedUser) =>
    ({
      getHandler: () => handler,
      getClass: () => TestController as Type<unknown>,
      switchToHttp: () => ({
        getRequest: () => ({ user: authenticatedUser }),
      }),
    }) as unknown as ExecutionContext;

  const createGuard = (required?: PermissionCode) => {
    const getAllAndOverride = jest.fn().mockReturnValue(required);
    const reflector = { getAllAndOverride } as unknown as Reflector;
    return {
      guard: new PermissionGuard(reflector),
      getAllAndOverride,
    };
  };

  it('allows routes without permission metadata', () => {
    const { guard } = createGuard();

    expect(guard.canActivate(context())).toBe(true);
  });

  it('allows users who hold the required permission', () => {
    const { guard, getAllAndOverride } = createGuard('product.update');

    expect(
      guard.canActivate(context(user(['product.read', 'product.update']))),
    ).toBe(true);
    const reflectorCalls = getAllAndOverride.mock.calls as unknown as Array<
      [string, unknown[]]
    >;
    expect(reflectorCalls[0][0]).toBe('requiredPermission');
  });

  it('rejects missing users and users without the required permission', () => {
    const { guard } = createGuard('product.delete');

    expect(() => guard.canActivate(context())).toThrow(
      new ForbiddenException('Missing permission: product.delete'),
    );
    expect(() => guard.canActivate(context(user(['product.read'])))).toThrow(
      new ForbiddenException('Missing permission: product.delete'),
    );
  });
});
