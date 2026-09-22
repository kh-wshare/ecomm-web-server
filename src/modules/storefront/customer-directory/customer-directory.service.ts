import { Injectable } from '@nestjs/common';
import { PrismaService } from '#app/infrastructure/database/prisma.service';

export type DirectoryAccount = {
  id: string;
  email: string | null;
  fullName: string;
};

/**
 * Maps a signed-in shopper to the merchant-side `Customer` row their orders
 * and addresses hang off.
 *
 * Shared by the account address book and by cart binding so the two can't
 * drift apart and start creating a second customer row for the same person.
 */
@Injectable()
export class CustomerDirectoryService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveForUser(merchantId: string, account: DirectoryAccount) {
    // An address they already own is the strongest signal, and it keeps the
    // mapping stable even if they later change the email on their account.
    //
    // `ownerId` is only ever a shopper's own account. Staff authorship lives
    // in `createdById`, precisely so that a cashier who saved an address for a
    // walk-in customer is not resolved to that customer when they later shop
    // the storefront themselves.
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
