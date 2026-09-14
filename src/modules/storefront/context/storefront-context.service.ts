import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '#app/infrastructure/database/prisma.service';

export interface StorefrontMerchant {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
}

/**
 * Resolves a public `:merchantSlug` path segment to the merchant behind it.
 *
 * Every storefront surface needs this first — catalog, cart, addresses,
 * delivery quoting and checkout — and each used to carry its own copy of the
 * slug lookup, which meant the "is this storefront actually live?" rule
 * (ACTIVE and not soft-deleted) was restated in several places. One copy here,
 * following the same extraction as `CartPricingService`.
 */
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
}
