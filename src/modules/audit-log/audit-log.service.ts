import { Injectable } from '@nestjs/common';
import { Prisma } from '#app/generated/prisma/client';
import { PrismaService } from '#app/infrastructure/database/prisma.service';

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId?: string;
  merchantId?: string;
  userId?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  write(entry: AuditEntry) {
    return this.prisma.auditLog.create({ data: entry });
  }
}
