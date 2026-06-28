import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '#app/infrastructure/database/prisma.service';

@Injectable()
export class MerchantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findCurrent(merchantId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');
    return merchant;
  }
}
