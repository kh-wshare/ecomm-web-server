import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '#app/common/responses/pagination.response';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { AddressService } from '#app/modules/address/address.service';
import { CreateAddressDto } from '#app/modules/address/dto/address-input.dto';
import { PosAddressQueryDto } from './dto/pos-address-query.dto';

/**
 * Addresses a staff member saves on a customer's behalf — a phone/walk-in
 * order taken in person, distinct from `GuestAddressService`, which only ever
 * runs through an anonymous shopper's cart.
 *
 * These rows record the staff member in `createdById` and leave `ownerId`
 * null. A walk-in customer has no account, so nothing here may claim to be
 * one: `StorefrontContextService` treats a non-null `ownerId` as proof that a
 * user account belongs to that customer.
 */
@Injectable()
export class PosAddressesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly addresses: AddressService,
  ) {}

  async create(
    merchantId: string,
    customerId: string,
    createdById: string,
    dto: CreateAddressDto,
  ) {
    await this.requireCustomer(merchantId, customerId);
    return this.addresses.create({ merchantId, customerId, createdById }, dto);
  }

  async findAllByCreator(
    merchantId: string,
    createdById: string,
    query: PosAddressQueryDto,
  ) {
    const where = { merchantId, createdById };
    const [addresses, total] = await Promise.all([
      this.addresses.findMany(where, {
        withCustomer: true,
        skip: query.skip,
        take: query.take,
      }),
      this.addresses.count(where),
    ]);
    return new PaginatedResult(addresses, query.take, query.page ?? 1, total);
  }

  private async requireCustomer(merchantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, merchantId, deletedAt: null },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }
}
