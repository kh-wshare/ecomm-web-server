import {
  BadRequestException,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import {
  StorefrontContextService,
  StorefrontMerchant,
} from './storefront-context.service';
import {
  StorefrontMerchantGuard,
  StorefrontRequest,
} from './storefront-merchant.guard';

describe('StorefrontMerchantGuard', () => {
  const merchant: StorefrontMerchant = {
    id: 'merchant-1',
    name: 'Acme',
    slug: 'acme-store',
    email: null,
    phone: null,
  };

  const setup = (header?: string | string[]) => {
    const request = {
      headers: { 'x-merchant-slug': header },
    } as unknown as StorefrontRequest;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    const resolveMerchant = jest.fn().mockResolvedValue(merchant);
    const guard = new StorefrontMerchantGuard({
      resolveMerchant,
    } as unknown as StorefrontContextService);
    return { guard, context, request, resolveMerchant };
  };

  it('pins the resolved merchant on the request', async () => {
    const { guard, context, request, resolveMerchant } = setup(' Acme-Store ');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(resolveMerchant).toHaveBeenCalledWith('acme-store');
    expect(request.storefrontMerchant).toEqual(merchant);
  });

  it('requires the header', async () => {
    const { guard, context, resolveMerchant } = setup();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(resolveMerchant).not.toHaveBeenCalled();
  });

  it('rejects a malformed slug without touching the database', async () => {
    const { guard, context, resolveMerchant } = setup('acme store/../x');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(resolveMerchant).not.toHaveBeenCalled();
  });

  it('surfaces an unknown storefront as not found', async () => {
    const { guard, context, resolveMerchant } = setup('ghost-store');
    resolveMerchant.mockRejectedValue(
      new NotFoundException('Storefront not found'),
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
