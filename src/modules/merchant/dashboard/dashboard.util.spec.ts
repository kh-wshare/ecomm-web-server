import { Prisma } from '#app/generated/prisma/client';
import {
  bucketRevenue,
  computeChange,
  resolveDashboardRange,
} from './dashboard.util';

describe('resolveDashboardRange', () => {
  it('resolves 30d to a 30-calendar-day UTC window starting 29 days ago', () => {
    const resolved = resolveDashboardRange('30d', undefined, undefined);
    const expectedStart = new Date();
    expectedStart.setUTCDate(expectedStart.getUTCDate() - 29);
    expect(resolved.start.toISOString().slice(0, 10)).toBe(
      expectedStart.toISOString().slice(0, 10),
    );
    expect(resolved.interval).toBe('day');
  });

  it('defaults today to an hour interval', () => {
    const resolved = resolveDashboardRange('today', undefined, undefined);
    expect(resolved.interval).toBe('hour');
  });

  it('throws when range is custom but from/to are missing', () => {
    expect(() =>
      resolveDashboardRange('custom', undefined, undefined),
    ).toThrow();
  });

  it('throws when from is after to', () => {
    expect(() =>
      resolveDashboardRange('custom', '2026-09-10', '2026-09-01'),
    ).toThrow();
  });

  it('resolves a custom range spanning the given days', () => {
    const resolved = resolveDashboardRange(
      'custom',
      '2026-09-01',
      '2026-09-03',
    );
    expect(resolved.start.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(resolved.end.toISOString()).toBe('2026-09-03T23:59:59.999Z');
  });

  it('sets the previous window to the same length immediately before start', () => {
    const resolved = resolveDashboardRange(
      'custom',
      '2026-09-11',
      '2026-09-20',
    );
    const spanMs = resolved.end.getTime() - resolved.start.getTime();
    expect(resolved.previousEnd.getTime()).toBe(resolved.start.getTime());
    expect(resolved.previousStart.getTime()).toBe(
      resolved.start.getTime() - spanMs,
    );
  });

  it('respects an explicit interval override', () => {
    const resolved = resolveDashboardRange('30d', undefined, undefined, 'week');
    expect(resolved.interval).toBe('week');
  });
});

describe('bucketRevenue', () => {
  it('creates one zero-filled bucket per day across the range', () => {
    const resolved = resolveDashboardRange(
      'custom',
      '2026-09-01',
      '2026-09-03',
    );
    const points = bucketRevenue([], resolved);
    expect(points.map((point) => point.bucket)).toEqual([
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
    ]);
    expect(
      points.every((point) => point.revenue.eq(0) && point.orders === 0),
    ).toBe(true);
  });

  it('sums orders into the bucket matching their paidAt day', () => {
    const resolved = resolveDashboardRange(
      'custom',
      '2026-09-01',
      '2026-09-03',
    );
    const points = bucketRevenue(
      [
        {
          paidAt: new Date('2026-09-01T10:00:00Z'),
          totalAmount: new Prisma.Decimal(10),
        },
        {
          paidAt: new Date('2026-09-01T22:00:00Z'),
          totalAmount: new Prisma.Decimal(5),
        },
        {
          paidAt: new Date('2026-09-03T00:00:00Z'),
          totalAmount: new Prisma.Decimal(7),
        },
      ],
      resolved,
    );
    expect(points[0].revenue.toFixed(2)).toBe('15.00');
    expect(points[0].orders).toBe(2);
    expect(points[1].orders).toBe(0);
    expect(points[2].revenue.toFixed(2)).toBe('7.00');
  });

  it('ignores orders outside the resolved bucket range', () => {
    const resolved = resolveDashboardRange(
      'custom',
      '2026-09-01',
      '2026-09-03',
    );
    const points = bucketRevenue(
      [
        {
          paidAt: new Date('2026-09-10T00:00:00Z'),
          totalAmount: new Prisma.Decimal(99),
        },
      ],
      resolved,
    );
    expect(points.reduce((sum, point) => sum + point.orders, 0)).toBe(0);
  });
});

describe('computeChange', () => {
  it('reports up when current exceeds previous', () => {
    const result = computeChange(
      new Prisma.Decimal(150),
      new Prisma.Decimal(100),
    );
    expect(result.trend).toBe('up');
    expect(result.changePct).toBe(50);
  });

  it('reports down when current is below previous', () => {
    const result = computeChange(
      new Prisma.Decimal(50),
      new Prisma.Decimal(100),
    );
    expect(result.trend).toBe('down');
    expect(result.changePct).toBe(-50);
  });

  it('reports flat when unchanged', () => {
    const result = computeChange(
      new Prisma.Decimal(100),
      new Prisma.Decimal(100),
    );
    expect(result.trend).toBe('flat');
    expect(result.changePct).toBe(0);
  });

  it('treats a zero previous period with current revenue as 100% up', () => {
    const result = computeChange(new Prisma.Decimal(10), new Prisma.Decimal(0));
    expect(result.trend).toBe('up');
    expect(result.changePct).toBe(100);
  });

  it('treats a zero previous period with no current revenue as flat', () => {
    const result = computeChange(new Prisma.Decimal(0), new Prisma.Decimal(0));
    expect(result.trend).toBe('flat');
    expect(result.changePct).toBe(0);
  });
});
