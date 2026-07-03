import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

@Injectable()
export class CommerceCacheService {
  private readonly logger = new Logger(CommerceCacheService.name);

  constructor(private readonly redis: RedisService) {}

  publicProductsKey(merchantId: string) {
    return `merchant:${merchantId}:products:public`;
  }

  dashboardKey(merchantId: string) {
    return `merchant:${merchantId}:dashboard`;
  }

  async remember<T>(
    key: string,
    producer: () => Promise<T>,
    ttlSeconds: number,
  ): Promise<T> {
    try {
      const cached = await this.redis.get(key);
      if (cached !== null) return JSON.parse(cached) as T;
    } catch (error) {
      this.logFailure('read', key, error);
    }

    const value = await producer();
    try {
      await this.redis.set(key, JSON.stringify(value), ttlSeconds);
    } catch (error) {
      this.logFailure('write', key, error);
    }
    return value;
  }

  async rememberHash<T>(
    key: string,
    field: string,
    producer: () => Promise<T>,
    ttlSeconds: number,
  ): Promise<T> {
    try {
      const cached = await this.redis.hget(key, field);
      if (cached !== null) return JSON.parse(cached) as T;
    } catch (error) {
      this.logFailure('read', `${key}[${field}]`, error);
      try {
        await this.redis.hdel(key, field);
      } catch {
        // Redis availability must never block the database fallback.
      }
    }

    const value = await producer();
    try {
      await this.redis.hset(key, field, JSON.stringify(value), ttlSeconds);
    } catch (error) {
      this.logFailure('write', `${key}[${field}]`, error);
    }
    return value;
  }

  async invalidatePublicProducts(merchantId: string) {
    await this.invalidate(this.publicProductsKey(merchantId));
  }

  async invalidateDashboard(merchantId: string) {
    await this.invalidate(this.dashboardKey(merchantId));
  }

  async invalidateCatalog(merchantId: string) {
    await Promise.all([
      this.invalidatePublicProducts(merchantId),
      this.invalidateDashboard(merchantId),
    ]);
  }

  private async invalidate(key: string) {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logFailure('invalidate', key, error);
    }
  }

  private logFailure(action: string, key: string, error: unknown) {
    this.logger.warn(
      `Cache ${action} failed for ${key}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
