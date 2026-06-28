import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client?: Redis;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('redis.url');
    const host = this.config.get<string>('redis.host', 'localhost');
    const port = this.config.get<number>('redis.port', 6379);
    const password = this.config.get<string>('redis.password');

    this.client = url
      ? new Redis(url, { lazyConnect: true })
      : new Redis({ host, port, password, lazyConnect: true });

    this.client.on('connect', () =>
      this.logger.log(`Redis connected at ${url ?? `${host}:${port}`}`),
    );
    this.client.on('error', (err) =>
      this.logger.error('Redis error', err.message),
    );

    try {
      await this.client.connect();
    } catch (err) {
      this.logger.error(
        'Redis connect failed',
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }

  async get(key: string): Promise<string | null> {
    return this.getClient().get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.getClient().set(key, value, 'EX', ttlSeconds);
    } else {
      await this.getClient().set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.getClient().del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.getClient().exists(key)) === 1;
  }

  async ttl(key: string): Promise<number> {
    return this.getClient().ttl(key);
  }

  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client has not been initialized');
    }
    return this.client;
  }
}
