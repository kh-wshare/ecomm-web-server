import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '#app/generated/prisma/client';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { DeliveryQuoteService } from '#app/modules/logistics/delivery-quote.service';
import { ShipmentsService } from '#app/modules/logistics/shipments.service';
import { QuoteDeliveryDto } from './dto/storefront-delivery.dto';

@Injectable()
export class StorefrontDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly delivery: DeliveryQuoteService,
    private readonly shipments: ShipmentsService,
  ) {}

  /**
   * Quote delivery before a cart exists — for a shipping calculator on a
   * product page, say. Without an address only pickup methods can be priced.
   */
  async quote(merchantId: string, query: QuoteDeliveryDto) {
    const hasAddress = Boolean(query.country ?? query.city ?? query.province);
    const quotes = await this.delivery.quote(
      merchantId,
      hasAddress
        ? {
            country: query.country,
            province: query.province,
            city: query.city,
            postalCode: query.postalCode,
          }
        : null,
      {
        itemCount: query.itemCount ?? 1,
        subtotal: new Prisma.Decimal(query.subtotal ?? 0),
      },
    );
    return quotes.map((quote) => ({
      methodId: quote.methodId,
      code: quote.code,
      name: quote.name,
      description: quote.description,
      type: quote.type,
      branchId: quote.branchId,
      isDefault: quote.isDefault,
      zoneId: quote.zoneId,
      zoneName: quote.zoneName,
      fee: quote.fee.toString(),
      estimatedMinDays: quote.estimatedMinDays,
      estimatedMaxDays: quote.estimatedMaxDays,
    }));
  }

  /**
   * Tracking for one order. Gated on the customer email that placed it, the
   * same check `StorefrontService.getOrder` uses — an order number alone must
   * not expose a shopper's delivery address or movements.
   */
  async trackOrder(
    merchantId: string,
    orderNumber: string,
    customerEmail: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: {
        merchantId,
        orderNumber: orderNumber.trim(),
        customerEmail: {
          equals: customerEmail.trim(),
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        orderNumber: true,
        fulfillmentStatus: true,
        deliveryMethodName: true,
        shippingAddress: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    return {
      orderNumber: order.orderNumber,
      fulfillmentStatus: order.fulfillmentStatus,
      deliveryMethodName: order.deliveryMethodName,
      shippingAddress: order.shippingAddress,
      shipments: await this.shipments.findForOrder(merchantId, order.id),
    };
  }
}
