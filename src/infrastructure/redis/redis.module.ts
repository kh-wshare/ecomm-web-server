import { Global, Module } from '@nestjs/common';
import { CommerceCacheService } from './commerce-cache.service';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService, CommerceCacheService],
  exports: [RedisService, CommerceCacheService],
})
export class RedisModule {}
