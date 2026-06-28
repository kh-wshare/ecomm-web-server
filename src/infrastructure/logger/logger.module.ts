import { Global, Module } from '@nestjs/common';
import { LoggingInterceptor } from '#app/common/interceptors/logging.interceptor';

@Global()
@Module({
  providers: [LoggingInterceptor],
  exports: [LoggingInterceptor],
})
export class LoggerModule {}
