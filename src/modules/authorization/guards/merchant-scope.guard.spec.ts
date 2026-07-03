import { ExecutionContext, ForbiddenException, Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformRole, UserStatus } from '#app/generated/prisma/enums';
import { AuthenticatedUser } from '#app/modules/authenticated/interfaces/authenticated-user.interface';
import { MerchantScopeGuard } from './merchant-scope.guard';

describe('MerchantScopeGuard', () => {
  const handler = () => undefined;
  class TestController {}

  const user = (merchantId: string | null): AuthenticatedUser => ({
    id: 'user-1',
    email: 'owner@example.com',
    fullName: 'Owner',
    status: UserStatus.ACTIVE,
    platformRole: PlatformRole.USER,
    sessionId: 'session-1',
    merchantId,
    merchantName: merchantId ? 'Merchant' : null,
    role: merchantId ? 'owner' : null,
    permissions: [],
  });

  const context = (
    authenticatedUser?: AuthenticatedUser,
    header?: string | string[],
  ) =>
    ({
      getHandler: () => handler,
      getClass: () => TestController as Type<unknown>,
      switchToHttp: () => ({
        getRequest: () => ({
          user: authenticatedUser,
          headers: { 'x-merchant-id': header },
        }),
      }),
    }) as unknown as ExecutionContext;

  const createGuard = (required: boolean | undefined = true) => {
    const getAllAndOverride = jest.fn().mockReturnValue(required);
    const reflector = { getAllAndOverride } as unknown as Reflector;
    return new MerchantScopeGuard(reflector);
  };

  it('allows routes without merchant metadata', () => {
    expect(createGuard(false).canActivate(context())).toBe(true);
  });

  it('requires an active merchant in the authenticated token', () => {
    const guard = createGuard();

    expect(() => guard.canActivate(context())).toThrow(
      new ForbiddenException('An active merchant context is required'),
    );
    expect(() => guard.canActivate(context(user(null)))).toThrow(
      new ForbiddenException('An active merchant context is required'),
    );
  });

  it('accepts an omitted or matching merchant header', () => {
    const guard = createGuard();

    expect(guard.canActivate(context(user('merchant-1')))).toBe(true);
    expect(guard.canActivate(context(user('merchant-1'), 'merchant-1'))).toBe(
      true,
    );
    expect(guard.canActivate(context(user('merchant-1'), ['merchant-1']))).toBe(
      true,
    );
  });

  it('rejects a header that attempts to change tenant scope', () => {
    expect(() =>
      createGuard().canActivate(context(user('merchant-1'), 'merchant-2')),
    ).toThrow(new ForbiddenException('Merchant context does not match token'));
  });
});
