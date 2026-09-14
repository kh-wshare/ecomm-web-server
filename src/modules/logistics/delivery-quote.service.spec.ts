import { Prisma } from '#app/generated/prisma/client';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { DeliveryQuoteService } from './delivery-quote.service';

type ZoneOverrides = Partial<{
  id: string;
  name: string;
  countries: string[];
  provinces: string[];
  cities: string[];
  postalCodes: string[];
  baseFee: Prisma.Decimal;
  perItemFee: Prisma.Decimal;
  freeOverSubtotal: Prisma.Decimal | null;
  minSubtotal: Prisma.Decimal | null;
  maxSubtotal: Prisma.Decimal | null;
  estimatedMinDays: number | null;
  estimatedMaxDays: number | null;
  isFallback: boolean;
}>;

const zone = (overrides: ZoneOverrides = {}) => ({
  id: 'zone-1',
  name: 'Phnom Penh',
  countries: ['KH'],
  provinces: [],
  cities: ['Phnom Penh'],
  postalCodes: [],
  baseFee: new Prisma.Decimal(2),
  perItemFee: new Prisma.Decimal(0),
  freeOverSubtotal: null,
  minSubtotal: null,
  maxSubtotal: null,
  estimatedMinDays: 1,
  estimatedMaxDays: 3,
  isFallback: false,
  ...overrides,
});

const method = (
  overrides: Partial<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    type: 'DELIVERY' | 'PICKUP';
    branchId: string | null;
    isDefault: boolean;
    zones: ReturnType<typeof zone>[];
  }> = {},
) => ({
  id: 'method-1',
  code: 'STANDARD',
  name: 'Standard delivery',
  description: null,
  type: 'DELIVERY' as const,
  branchId: null,
  isDefault: false,
  zones: [zone()],
  ...overrides,
});

const createHarness = (methods: ReturnType<typeof method>[] = [method()]) => {
  const findMany = jest.fn().mockResolvedValue(methods);
  const prisma = { deliveryMethod: { findMany } } as unknown as PrismaService;
  return { service: new DeliveryQuoteService(prisma), findMany };
};

const address = (overrides: Record<string, string | null> = {}) => ({
  country: 'KH',
  province: null,
  city: 'Phnom Penh',
  postalCode: null,
  ...overrides,
});

const cart = (subtotal = 20, itemCount = 2) => ({
  itemCount,
  subtotal: new Prisma.Decimal(subtotal),
});

describe('DeliveryQuoteService', () => {
  it('prices a matching zone at its base fee', async () => {
    const { service } = createHarness();

    const quotes = await service.quote('merchant-1', address(), cart());

    expect(quotes).toHaveLength(1);
    expect(quotes[0].fee.toString()).toBe('2');
    expect(quotes[0].zoneId).toBe('zone-1');
    expect(quotes[0].estimatedMaxDays).toBe(3);
  });

  it('adds the per-item fee once per unit in the cart', async () => {
    const { service } = createHarness([
      method({ zones: [zone({ perItemFee: new Prisma.Decimal('0.5') })] }),
    ]);

    const quotes = await service.quote('merchant-1', address(), cart(20, 4));

    expect(quotes[0].fee.toString()).toBe('4');
  });

  it('ships free once the cart clears the free-shipping threshold', async () => {
    const { service } = createHarness([
      method({
        zones: [zone({ freeOverSubtotal: new Prisma.Decimal(50) })],
      }),
    ]);

    const [below] = await service.quote('merchant-1', address(), cart(49));
    const [atThreshold] = await service.quote(
      'merchant-1',
      address(),
      cart(50),
    );

    expect(below.fee.toString()).toBe('2');
    expect(atThreshold.fee.toString()).toBe('0');
  });

  it('offers no option when the address falls outside every zone', async () => {
    const { service } = createHarness();

    const quotes = await service.quote(
      'merchant-1',
      address({ city: 'Siem Reap' }),
      cart(),
    );

    expect(quotes).toEqual([]);
  });

  it('treats an empty geo list as a wildcard for that field', async () => {
    const { service } = createHarness([
      method({ zones: [zone({ cities: [] })] }),
    ]);

    const quotes = await service.quote(
      'merchant-1',
      address({ city: 'Siem Reap' }),
      cart(),
    );

    expect(quotes).toHaveLength(1);
  });

  it('matches geo values case- and whitespace-insensitively', async () => {
    const { service } = createHarness([
      method({ zones: [zone({ cities: ['  PHNOM PENH '] })] }),
    ]);

    const quotes = await service.quote(
      'merchant-1',
      address({ city: 'phnom penh' }),
      cart(),
    );

    expect(quotes).toHaveLength(1);
  });

  it('prefers a specific zone over a fallback zone', async () => {
    const { service } = createHarness([
      method({
        zones: [
          zone({ id: 'specific', baseFee: new Prisma.Decimal(2) }),
          zone({
            id: 'fallback',
            isFallback: true,
            cities: [],
            countries: [],
            baseFee: new Prisma.Decimal(9),
          }),
        ],
      }),
    ]);

    const quotes = await service.quote('merchant-1', address(), cart());

    expect(quotes[0].zoneId).toBe('specific');
    expect(quotes[0].fee.toString()).toBe('2');
  });

  it('falls back to the fallback zone for an unmatched address', async () => {
    const { service } = createHarness([
      method({
        zones: [
          zone({ id: 'specific' }),
          zone({
            id: 'fallback',
            isFallback: true,
            cities: [],
            countries: [],
            baseFee: new Prisma.Decimal(9),
          }),
        ],
      }),
    ]);

    const quotes = await service.quote(
      'merchant-1',
      address({ city: 'Siem Reap' }),
      cart(),
    );

    expect(quotes[0].zoneId).toBe('fallback');
    expect(quotes[0].fee.toString()).toBe('9');
  });

  it('skips a zone whose subtotal band excludes the cart', async () => {
    const { service } = createHarness([
      method({ zones: [zone({ minSubtotal: new Prisma.Decimal(30) })] }),
    ]);

    expect(await service.quote('merchant-1', address(), cart(20))).toEqual([]);
    expect(await service.quote('merchant-1', address(), cart(30))).toHaveLength(
      1,
    );
  });

  it('offers pickup for free and without an address', async () => {
    const { service } = createHarness([
      method({ type: 'PICKUP', branchId: 'branch-1', zones: [] }),
    ]);

    const quotes = await service.quote('merchant-1', null, cart());

    expect(quotes).toHaveLength(1);
    expect(quotes[0].fee.toString()).toBe('0');
    expect(quotes[0].branchId).toBe('branch-1');
    expect(quotes[0].zoneId).toBeNull();
  });

  it('offers no delivery option at all when there is no address', async () => {
    const { service } = createHarness();

    expect(await service.quote('merchant-1', null, cart())).toEqual([]);
  });

  it('only queries live methods for the given merchant', async () => {
    const { service, findMany } = createHarness();

    await service.quote('merchant-1', address(), cart());

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { merchantId: 'merchant-1', status: 'ACTIVE', deletedAt: null },
      }),
    );
  });

  describe('quoteMethod', () => {
    it('returns the one requested method', async () => {
      const { service } = createHarness([
        method({ id: 'method-1' }),
        method({
          id: 'method-2',
          code: 'EXPRESS',
          zones: [zone({ id: 'z2' })],
        }),
      ]);

      const quote = await service.quoteMethod(
        'merchant-1',
        'method-2',
        address(),
        cart(),
      );

      expect(quote?.methodId).toBe('method-2');
    });

    it('returns null when the method no longer serves the address', async () => {
      const { service } = createHarness();

      const quote = await service.quoteMethod(
        'merchant-1',
        'method-1',
        address({ city: 'Siem Reap' }),
        cart(),
      );

      expect(quote).toBeNull();
    });
  });
});
