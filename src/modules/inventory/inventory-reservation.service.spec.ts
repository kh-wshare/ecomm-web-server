import { ConflictException } from '@nestjs/common';
import { SalesChannel } from '#app/generated/prisma/enums';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { NotificationService } from '#app/modules/notification/notification.service';
import { InventoryService } from './inventory.service';

describe('InventoryService reservations', () => {
  const expiresAt = new Date('2026-07-03T00:00:00.000Z');
  const stock = {
    id: 'stock-1',
    merchantId: 'merchant-1',
    productId: 'product-1',
    variantId: null,
    stockKey: 'product:product-1',
    totalStock: 10,
    reservedStock: 2,
    soldStock: 1,
    safetyBuffer: 3,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  const reservation = {
    id: 'reservation-1',
    merchantId: 'merchant-1',
    inventoryStockId: stock.id,
    productId: stock.productId,
    variantId: null,
    orderId: null,
    checkoutSessionId: 'checkout-1',
    quantity: 4,
    status: 'ACTIVE',
    expiresAt,
    createdAt: new Date('2026-07-02T00:00:00.000Z'),
    updatedAt: new Date('2026-07-02T00:00:00.000Z'),
  };

  const createHarness = () => {
    const productFindFirst = jest.fn().mockResolvedValue({
      id: stock.productId,
      status: 'ACTIVE',
      channelVisibility: [
        {
          channel: SalesChannel.WEBSITE,
          isVisible: true,
          isPurchasable: true,
        },
        {
          channel: SalesChannel.POS,
          isVisible: true,
          isPurchasable: true,
        },
      ],
      variants: [],
    });
    const queryRaw = jest.fn().mockResolvedValue([stock]);
    const reservationFindMany = jest.fn().mockResolvedValue([]);
    const reservationFindUnique = jest.fn().mockResolvedValue(null);
    const reservationCreate = jest.fn().mockResolvedValue(reservation);
    const stockUpdate = jest.fn().mockResolvedValue({
      ...stock,
      reservedStock: stock.reservedStock + reservation.quantity,
    });
    const movementCreate = jest.fn().mockResolvedValue({ id: 'movement-1' });
    const auditCreate = jest.fn().mockResolvedValue({ id: 'audit-1' });
    const tx = {
      $queryRaw: queryRaw,
      inventoryReservation: {
        findMany: reservationFindMany,
        findUnique: reservationFindUnique,
        create: reservationCreate,
      },
      inventoryStock: { update: stockUpdate },
      inventoryMovement: { create: movementCreate },
      auditLog: { create: auditCreate },
    };
    const transaction = jest
      .fn()
      .mockImplementation(
        (operation: (client: typeof tx) => Promise<unknown>) => operation(tx),
      );
    const prisma = {
      product: { findFirst: productFindFirst },
      $transaction: transaction,
    } as unknown as PrismaService;
    const syncStockAlert = jest.fn().mockResolvedValue(null);
    const notifications = {
      syncStockAlert,
    } as unknown as NotificationService;

    return {
      service: new InventoryService(prisma, notifications),
      transaction,
      reservationCreate,
      stockUpdate,
      movementCreate,
      auditCreate,
      syncStockAlert,
    };
  };

  it('reserves online-sellable stock and records its movement and audit', async () => {
    const harness = createHarness();

    const result = await harness.service.reserveCheckout(
      'merchant-1',
      'user-1',
      'checkout-1',
      SalesChannel.WEBSITE,
      [{ productId: 'product-1', quantity: 4 }],
      expiresAt,
      { ipAddress: '127.0.0.1' },
    );

    expect(result).toHaveLength(1);
    expect(result[0].reservation).toBe(reservation);
    expect(
      result[0].stock as {
        reservedStock: number;
        availableStock: number;
        onlineSellableStock: number;
      },
    ).toMatchObject({
      reservedStock: 6,
      availableStock: 3,
      onlineSellableStock: 0,
    });
    const reservationCreateCalls = harness.reservationCreate.mock
      .calls as unknown as Array<
      [
        {
          data: {
            merchantId: string;
            checkoutSessionId: string;
            quantity: number;
          };
        },
      ]
    >;
    expect(reservationCreateCalls[0][0].data).toMatchObject({
      merchantId: 'merchant-1',
      checkoutSessionId: 'checkout-1',
      quantity: 4,
    });
    const stockUpdateCalls = harness.stockUpdate.mock.calls as unknown as Array<
      [
        {
          where: { id: string };
          data: { reservedStock: { increment: number } };
        },
      ]
    >;
    expect(stockUpdateCalls[0][0]).toEqual({
      where: { id: stock.id },
      data: { reservedStock: { increment: 4 } },
    });
    expect(harness.movementCreate.mock.calls).toHaveLength(1);
    expect(harness.auditCreate.mock.calls).toHaveLength(1);
    expect(harness.syncStockAlert.mock.calls).toEqual([
      ['merchant-1', stock.id],
    ]);
  });

  it('enforces the safety buffer for website reservations', async () => {
    const harness = createHarness();

    await expect(
      harness.service.reserveCheckout(
        'merchant-1',
        null,
        'checkout-1',
        SalesChannel.WEBSITE,
        [{ productId: 'product-1', quantity: 5 }],
        expiresAt,
        {},
      ),
    ).rejects.toThrow(new ConflictException('Insufficient sellable stock'));
    expect(harness.reservationCreate.mock.calls).toHaveLength(0);
    expect(harness.stockUpdate.mock.calls).toHaveLength(0);
    expect(harness.syncStockAlert.mock.calls).toHaveLength(0);
  });

  it('rejects duplicate stock targets before opening a transaction', async () => {
    const harness = createHarness();

    await expect(
      harness.service.reserveCheckout(
        'merchant-1',
        'user-1',
        'checkout-1',
        SalesChannel.POS,
        [
          { productId: 'product-1', quantity: 1 },
          { productId: 'product-1', quantity: 2 },
        ],
        expiresAt,
        {},
      ),
    ).rejects.toThrow(new ConflictException('Duplicate checkout stock item'));
    expect(harness.transaction.mock.calls).toHaveLength(0);
  });
});
