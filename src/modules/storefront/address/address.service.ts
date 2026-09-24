import { Injectable } from '@nestjs/common';
import { AddressService } from '#app/modules/address/address.service';
import {
  CreateAddressDto,
  UpdateAddressDto,
} from '#app/modules/address/dto/address-input.dto';
import {
  ShopperAccount,
  StorefrontContextService,
} from '#app/modules/storefront/context/storefront-context.service';

@Injectable()
export class StorefrontAddressService {
  constructor(
    private readonly addresses: AddressService,
    private readonly context: StorefrontContextService,
  ) {}

  async findAll(merchantId: string, userId: string) {
    return this.addresses.findMany({ merchantId, ownerId: userId });
  }

  async create(
    merchantId: string,
    account: ShopperAccount,
    dto: CreateAddressDto,
  ) {
    const customerId = await this.context.resolveCustomerForUser(
      merchantId,
      account,
    );
    return this.addresses.create(
      { merchantId, customerId, ownerId: account.id },
      dto,
    );
  }

  async update(
    merchantId: string,
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ) {
    const address = await this.load(merchantId, userId, addressId);
    return this.addresses.update(addressId, address.customerId, dto);
  }

  async remove(merchantId: string, userId: string, addressId: string) {
    await this.load(merchantId, userId, addressId);
    return this.addresses.softDelete(addressId);
  }

  private async load(merchantId: string, userId: string, addressId: string) {
    return this.addresses.requireOne({
      id: addressId,
      merchantId,
      ownerId: userId,
    });
  }
}
