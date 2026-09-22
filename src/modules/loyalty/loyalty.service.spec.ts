import { Prisma } from '#app/generated/prisma/client';
import { LoyaltyEntryType } from '#app/generated/prisma/enums';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { LoyaltyService } from './loyalty.service';

describe('LoyaltyService', () => {
  const baseOrder = {
    id: 'order-1',
    merchantId: 'merchant-1',
    customerId: 'customer-1',
    ownerId: 'user-1' as string | null,
    subtotalAmount: new Prisma.Decimal(25),
    discountAmount: new Prisma.Decimal(0),
    orderNumber: 'ORD-1',
  };

  const createHarness = (
    overrides: {
      order?: Partial<typeof baseOrder> | null;
      merchant?: { loyaltyEnabled: boolean; loyaltyPointsPerUnit: number };
      earned?: { merchantId: string; customerId: string; points: number };
    } = {},
  ) => {
    const entryCreate = jest
      .fn<Promise<unknown>, [{ data: Record<string, unknown> }]>()
      .mockResolvedValue({});
    const customerUpdate = jest
      .fn<
        Promise<{ loyaltyPoints: number }>,
        [{ data: Record<string, unknown> }]
      >()
      .mockResolvedValue({ loyaltyPoints: 25 });
    const tx = {
      order: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            overrides.order === null
              ? null
              : { ...baseOrder, ...overrides.order },
          ),
      },
      merchant: {
        findUnique: jest.fn().mockResolvedValue(
          overrides.merchant ?? {
            loyaltyEnabled: true,
            loyaltyPointsPerUnit: 1,
          },
        ),
      },
      customer: { update: customerUpdate },
      loyaltyLedgerEntry: {
        create: entryCreate,
        findUnique: jest.fn().mockResolvedValue(overrides.earned ?? null),
      },
    } as unknown as Prisma.TransactionClient;

    const service = new LoyaltyService({} as PrismaService);
    return { service, tx, entryCreate, customerUpdate };
  };

  describe('grantForOrder', () => {
    it('grants points for an order placed from a signed-in account', async () => {
      const { service, tx, entryCreate, customerUpdate } = createHarness();

      await service.grantForOrder(tx, 'order-1');

      expect(customerUpdate.mock.calls[0][0]).toMatchObject({
        data: { loyaltyPoints: { increment: 25 } },
      });
      expect(entryCreate.mock.calls[0][0]).toMatchObject({
        data: {
          type: LoyaltyEntryType.EARNED,
          points: 25,
          balanceAfter: 25,
        },
      });
    });

    it('grants nothing to a guest order, even one linked to a customer', async () => {
      // The whole point of the ownerId gate: a guest who types a known email
      // gets a customerId, and must still not be able to top up that balance.
      const { service, tx, entryCreate, customerUpdate } = createHarness({
        order: { ownerId: null },
      });

      await service.grantForOrder(tx, 'order-1');

      expect(customerUpdate).not.toHaveBeenCalled();
      expect(entryCreate).not.toHaveBeenCalled();
    });

    it('grants nothing when the merchant has loyalty switched off', async () => {
      const { service, tx, entryCreate } = createHarness({
        merchant: { loyaltyEnabled: false, loyaltyPointsPerUnit: 1 },
      });

      await service.grantForOrder(tx, 'order-1');

      expect(entryCreate).not.toHaveBeenCalled();
    });

    it('earns on the discounted subtotal, ignoring fractions of a unit', async () => {
      const { service, tx, entryCreate } = createHarness({
        order: {
          subtotalAmount: new Prisma.Decimal('25.90'),
          discountAmount: new Prisma.Decimal('5.50'),
        },
        merchant: { loyaltyEnabled: true, loyaltyPointsPerUnit: 2 },
      });

      await service.grantForOrder(tx, 'order-1');

      // 25.90 - 5.50 = 20.40 -> floor 20 -> x2 = 40
      expect(entryCreate.mock.calls[0][0]).toMatchObject({
        data: { points: 40 },
      });
    });

    it('swallows the duplicate-grant conflict so a redelivered webhook is a no-op', async () => {
      const { service, tx, entryCreate } = createHarness();
      entryCreate.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('duplicate', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.grantForOrder(tx, 'order-1'),
      ).resolves.toBeUndefined();
    });

    it('propagates anything that is not a duplicate', async () => {
      const { service, tx, entryCreate } = createHarness();
      entryCreate.mockRejectedValue(new Error('connection lost'));

      await expect(service.grantForOrder(tx, 'order-1')).rejects.toThrow(
        'connection lost',
      );
    });
  });

  describe('reverseForOrder', () => {
    it('reverses exactly what was granted, not a recomputed amount', async () => {
      const { service, tx, entryCreate, customerUpdate } = createHarness({
        earned: {
          merchantId: 'merchant-1',
          customerId: 'customer-1',
          points: 40,
        },
      });

      await service.reverseForOrder(tx, 'order-1');

      expect(customerUpdate.mock.calls[0][0]).toMatchObject({
        data: { loyaltyPoints: { increment: -40 } },
      });
      expect(entryCreate.mock.calls[0][0]).toMatchObject({
        data: { type: LoyaltyEntryType.REVERSED, points: -40 },
      });
    });

    it('does nothing for an order that never earned', async () => {
      const { service, tx, entryCreate } = createHarness();

      await service.reverseForOrder(tx, 'order-1');

      expect(entryCreate).not.toHaveBeenCalled();
    });
  });
});
