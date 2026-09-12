import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PosDevicesModule } from '../devices/devices.module';
import { PosGateway } from './pos.gateway';

@Module({
  imports: [
    PosDevicesModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.secret'),
      }),
    }),
  ],
  providers: [PosGateway],
  exports: [PosGateway],
})
export class PosRealtimeModule {}
