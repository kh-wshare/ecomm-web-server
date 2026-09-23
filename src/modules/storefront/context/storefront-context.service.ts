import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '#app/infrastructure/database/prisma.service';

/** A signed-in shopper, as the storefront knows them. */
export type ShopperAccount = {
  id: string;
  email: string | null;
  fullName: string;
};

export interface StorefrontMerchant {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
}

@Injectable()
export class StorefrontContextService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveMerchant(slug: string): Promise<StorefrontMerchant> {
    const merchant = await this.prisma.merchant.findFirst({
      where: {
        slug: slug.trim().toLowerCase(),
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
      },
    });
    if (!merchant) throw new NotFoundException('Storefront not found');
    return merchant;
  }

  /** Just the id, for the many callers that never render the merchant. */
  async resolveMerchantId(slug: string): Promise<string> {
    const merchant = await this.resolveMerchant(slug);
    return merchant.id;
  }

  async resolveCustomerForUser(
    merchantId: string,
    account: ShopperAccount,
  ): Promise<string> {
    const owned = await this.prisma.customerAddress.findFirst({
      where: { merchantId, ownerId: account.id, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { customerId: true },
    });
    if (owned) return owned.customerId;

    const email = account.email?.trim().toLowerCase();
    const matched = email
      ? await this.prisma.customer.findFirst({
          where: {
            merchantId,
            deletedAt: null,
            email: { equals: email, mode: 'insensitive' },
          },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        })
      : null;
    if (matched) return matched.id;

    const created = await this.prisma.customer.create({
      data: { merchantId, fullName: account.fullName, email: email ?? null },
      select: { id: true },
    });
    return created.id;
  }
}
