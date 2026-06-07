import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

@Global() // Makes PrismaService available globally
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
