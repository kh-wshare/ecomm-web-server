import { CommerceCacheService } from './commerce-cache.service';
import { RedisService } from './redis.service';

describe('CommerceCacheService', () => {
  const createRedis = () =>
    ({
      get: jest.fn(),
      set: jest.fn(),
      hget: jest.fn(),
      hset: jest.fn(),
      hdel: jest.fn(),
      del: jest.fn(),
    }) as unknown as jest.Mocked<RedisService>;

  it('returns a cached value without calling the producer', async () => {
    const redis = createRedis();
    redis.get.mockResolvedValue(JSON.stringify({ total: 3 }));
    const cache = new CommerceCacheService(redis);
    const producer = jest.fn().mockResolvedValue({ total: 9 });

    await expect(cache.remember('summary', producer, 30)).resolves.toEqual({
      total: 3,
    });
    expect(producer).not.toHaveBeenCalled();
    expect(redis.set.mock.calls).toHaveLength(0);
  });

  it('falls back to the producer when Redis is unavailable', async () => {
    const redis = createRedis();
    redis.get.mockRejectedValue(new Error('connection refused'));
    redis.set.mockRejectedValue(new Error('connection refused'));
    const cache = new CommerceCacheService(redis);

    await expect(
      cache.remember('summary', () => Promise.resolve({ total: 7 }), 30),
    ).resolves.toEqual({ total: 7 });
  });

  it('stores query variants in one expiring product hash', async () => {
    const redis = createRedis();
    redis.hget.mockResolvedValue(null);
    const cache = new CommerceCacheService(redis);

    await expect(
      cache.rememberHash(
        cache.publicProductsKey('merchant-1'),
        'list:website',
        () => Promise.resolve([{ id: 'product-1' }]),
        60,
      ),
    ).resolves.toEqual([{ id: 'product-1' }]);
    expect(redis.hset.mock.calls).toContainEqual([
      'merchant:merchant-1:products:public',
      'list:website',
      JSON.stringify([{ id: 'product-1' }]),
      60,
    ]);
  });

  it('invalidates product and dashboard caches together', async () => {
    const redis = createRedis();
    const cache = new CommerceCacheService(redis);

    await cache.invalidateCatalog('merchant-1');

    expect(redis.del.mock.calls).toContainEqual([
      'merchant:merchant-1:products:public',
    ]);
    expect(redis.del.mock.calls).toContainEqual([
      'merchant:merchant-1:dashboard',
    ]);
  });
});
