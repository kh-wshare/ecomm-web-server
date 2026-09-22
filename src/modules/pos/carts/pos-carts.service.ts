import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { PosOrdersService } from '#app/modules/pos/orders/pos-orders.service';
import {
  CartItemInputDto,
  UpdateCartItemDto,
} from '#app/modules/storefront/cart/dto/cart-input.dto';
import { CartService } from '#app/modules/storefront/cart/cart.service';
import {
  CheckoutPosCartDto,
  CreatePosCartDto,
  UpdatePosCartContactDto,
} from './dto/pos-cart-input.dto';
import { PosCartQueryDto } from './dto/pos-cart-query.dto';

type AuditMetadata = { ipAddress?: string; userAgent?: string };

/**
 * Staff-built carts: a phone or walk-in order assembled over a call, then
 * rung up at the register.
 *
 * Every route here authorizes through `RequireMerchant` plus a POS
 * permission, never through the cart token — the token is handed out once at
 * creation and there is deliberately no way to read it back, so staff would
 * otherwise be locked out of their own cart the moment they lost the response.
 *
 * The cart itself is the storefront's: this reuses `CartService`'s line
 * merging, purchasability checks and re-pricing rather than forking them.
 */
@Injectable()
export class PosCartsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly carts: CartService,
    private readonly orders: PosOrdersService,
  ) {}

  async create(
    merchantId: string,
    customerId: string,
    createdById: string,
    dto: CreatePosCartDto,
  ) {
    await this.requireCustomer(merchantId, customerId);
    return this.carts.createForStaff(
      merchantId,
      customerId,
      createdById,
      dto.items,
    );
  }

  findAllByCreator(
    merchantId: string,
    createdById: string,
    query: PosCartQueryDto,
  ) {
    return this.carts.findManyByCreator(merchantId, createdById, {
      skip: query.skip,
      take: query.take,
      page: query.page ?? 1,
    });
  }

  async findOne(merchantId: string, cartId: string) {
    const cart = await this.carts.loadStaffCart(merchantId, cartId);
    return this.carts.presentCart(cart);
  }

  async addItem(merchantId: string, cartId: string, dto: CartItemInputDto) {
    const cart = await this.carts.loadActiveStaffCart(merchantId, cartId);
    return this.carts.addItemTo(cart, dto);
  }

  async updateItem(
    merchantId: string,
    cartId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ) {
    const cart = await this.carts.loadActiveStaffCart(merchantId, cartId);
    return this.carts.updateItemOn(cart, itemId, dto);
  }

  async removeItem(merchantId: string, cartId: string, itemId: string) {
    const cart = await this.carts.loadActiveStaffCart(merchantId, cartId);
    return this.carts.removeItemFrom(cart, itemId);
  }

  async clear(merchantId: string, cartId: string) {
    const cart = await this.carts.loadActiveStaffCart(merchantId, cartId);
    return this.carts.clearCart(cart.id);
  }

  async updateContact(
    merchantId: string,
    cartId: string,
    dto: UpdatePosCartContactDto,
  ) {
    const cart = await this.carts.loadActiveStaffCart(merchantId, cartId);
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: {
        ...(dto.customerName !== undefined
          ? { customerName: dto.customerName?.trim() || null }
          : {}),
        ...(dto.customerPhone !== undefined
          ? { customerPhone: dto.customerPhone?.trim() || null }
          : {}),
        ...(dto.note !== undefined ? { note: dto.note?.trim() || null } : {}),
      },
    });
    return this.findOne(merchantId, cartId);
  }

  /**
   * Rings the cart up on a register.
   *
   * Goes through `PosOrdersService` rather than `CheckoutService`, which
   * rejects the POS channel outright: a POS order needs a device, a shift and
   * the generous inventory hold that an open tab implies, and all of that
   * already lives in the POS order path. The cart is converted only after the
   * order exists, so a failure leaves the cart intact and re-rangeable.
   */
  async checkout(
    merchantId: string,
    userId: string,
    cartId: string,
    dto: CheckoutPosCartDto,
    metadata: AuditMetadata,
  ) {
    const cart = await this.carts.loadActiveStaffCart(merchantId, cartId);
    if (cart.items.length === 0) {
      throw new ConflictException('Cart is empty');
    }

    const order = await this.orders.create(
      merchantId,
      userId,
      {
        deviceId: dto.deviceId,
        tableId: dto.tableId,
        customerId: cart.customerId ?? undefined,
        customerName: cart.customerName ?? undefined,
        discountAmount: dto.discountAmount,
        note: cart.note ?? undefined,
        items: cart.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId ?? undefined,
          quantity: item.quantity,
          note: item.note ?? undefined,
        })),
      },
      metadata,
    );

    // The POS order view does not carry its checkout session, but the cart
    // should still point at it so a reopened cart lands on the real order.
    const placed = await this.prisma.order.findUnique({
      where: { id: order.id },
      select: { checkoutSessionId: true },
    });
    await this.carts.markConverted(cart.id, placed?.checkoutSessionId);
    return order;
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
