import { BadRequestException } from '@nestjs/common';
import { Prisma } from '#app/generated/prisma/client';

export const DASHBOARD_RANGES = [
  'today',
  '7d',
  '30d',
  '90d',
  'custom',
] as const;
export type DashboardRange = (typeof DASHBOARD_RANGES)[number];

export const DASHBOARD_INTERVALS = ['hour', 'day', 'week'] as const;
export type DashboardInterval = (typeof DASHBOARD_INTERVALS)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

export type ResolvedRange = {
  range: DashboardRange;
  interval: DashboardInterval;
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
};

/** Turns a `range` (plus `from`/`to` for `custom`) into concrete UTC boundaries. */
export function resolveDashboardRange(
  range: DashboardRange,
  from: string | undefined,
  to: string | undefined,
  intervalOverride?: DashboardInterval,
): ResolvedRange {
  const now = new Date();
  let start: Date;
  let end: Date;
  let defaultInterval: DashboardInterval;

  switch (range) {
    case 'today':
      start = startOfUtcDay(now);
      end = now;
      defaultInterval = 'hour';
      break;
    case '7d':
      start = startOfUtcDay(new Date(now.getTime() - 6 * DAY_MS));
      end = now;
      defaultInterval = 'day';
      break;
    case '30d':
      start = startOfUtcDay(new Date(now.getTime() - 29 * DAY_MS));
      end = now;
      defaultInterval = 'day';
      break;
    case '90d':
      start = startOfUtcDay(new Date(now.getTime() - 89 * DAY_MS));
      end = now;
      defaultInterval = 'week';
      break;
    case 'custom': {
      if (!from || !to) {
        throw new BadRequestException(
          'from and to are required when range is custom',
        );
      }
      start = startOfUtcDay(new Date(from));
      end = endOfUtcDay(new Date(to));
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new BadRequestException('from and to must be valid dates');
      }
      if (start > end) {
        throw new BadRequestException('from must be before to');
      }
      const spanDays = (end.getTime() - start.getTime()) / DAY_MS;
      defaultInterval = spanDays <= 60 ? 'day' : 'week';
      break;
    }
  }

  const span = end.getTime() - start.getTime();
  const previousEnd = start;
  const previousStart = new Date(start.getTime() - span);

  return {
    range,
    interval: intervalOverride ?? defaultInterval,
    start,
    end,
    previousStart,
    previousEnd,
  };
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function endOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

export type Trend = 'up' | 'down' | 'flat';

/** A decimal amount string, e.g. "1234.56" — the currency lives alongside it on DashboardSummary. */
export type Money = string;

export type Kpi<T> = {
  value: T;
  changePct: number;
  trend: Trend;
};

const RANGE_LABELS: Record<DashboardRange, string> = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  custom: 'Custom range',
};

const PREVIOUS_RANGE_LABELS: Record<DashboardRange, string> = {
  today: 'Yesterday',
  '7d': 'Previous 7 days',
  '30d': 'Previous 30 days',
  '90d': 'Previous 90 days',
  custom: 'Previous period',
};

export function rangeLabel(range: DashboardRange): string {
  return RANGE_LABELS[range];
}

export function previousRangeLabel(range: DashboardRange): string {
  return PREVIOUS_RANGE_LABELS[range];
}

export type RevenuePoint = {
  bucket: string;
  label: string;
  revenue: Prisma.Decimal;
  orders: number;
};

/** Buckets paid orders into fixed-width points covering [start, end]. */
export function bucketRevenue(
  orders: { paidAt: Date | null; totalAmount: Prisma.Decimal }[],
  resolved: Pick<ResolvedRange, 'start' | 'end' | 'interval'>,
): RevenuePoint[] {
  const { start, end, interval } = resolved;
  const stepMs =
    interval === 'hour'
      ? 60 * 60 * 1000
      : interval === 'week'
        ? 7 * DAY_MS
        : DAY_MS;

  const buckets = new Map<string, RevenuePoint>();
  for (
    let cursor = start.getTime();
    cursor <= end.getTime();
    cursor += stepMs
  ) {
    const bucketStart = new Date(cursor);
    const key = bucketKey(bucketStart, interval);
    buckets.set(key, {
      bucket: key,
      label: bucketLabel(bucketStart, interval),
      revenue: new Prisma.Decimal(0),
      orders: 0,
    });
  }

  for (const order of orders) {
    if (!order.paidAt) continue;
    const key = bucketKey(alignToStep(order.paidAt, start, stepMs), interval);
    const point = buckets.get(key);
    if (!point) continue;
    point.revenue = point.revenue.add(order.totalAmount);
    point.orders += 1;
  }

  return Array.from(buckets.values());
}

function alignToStep(date: Date, start: Date, stepMs: number) {
  const offset = date.getTime() - start.getTime();
  const steps = Math.floor(offset / stepMs);
  return new Date(start.getTime() + steps * stepMs);
}

function bucketKey(date: Date, interval: DashboardInterval) {
  if (interval === 'hour') {
    return date.toISOString().slice(0, 13) + ':00';
  }
  return date.toISOString().slice(0, 10);
}

function bucketLabel(date: Date, interval: DashboardInterval) {
  if (interval === 'hour') {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function computeChange(
  current: Prisma.Decimal,
  previous: Prisma.Decimal,
) {
  if (previous.lte(0)) {
    return {
      changePct: current.gt(0) ? 100 : 0,
      trend: current.gt(0) ? ('up' as const) : ('flat' as const),
    };
  }
  const changePct = current.sub(previous).div(previous).mul(100);
  const rounded = Math.round(changePct.toNumber() * 10) / 10;
  return {
    changePct: rounded,
    trend:
      rounded > 0
        ? ('up' as const)
        : rounded < 0
          ? ('down' as const)
          : ('flat' as const),
  };
}
