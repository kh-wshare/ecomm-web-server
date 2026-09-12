import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '#app/common/responses/pagination.response';
import { Prisma } from '#app/generated/prisma/client';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { CreateCustomerDto, CustomerQueryDto } from './dto/customer-input.dto';

type AuditMetadata = { ipAddress?: string; userAgent?: string };

@Injectable()
export class PosCustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(merchantId: string, query: CustomerQueryDto) {
    const where: Prisma.CustomerWhereInput = {
      merchantId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              {
                fullName: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
              { phone: { contains: query.search.trim() } },
              { email: { contains: query.search.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [customers, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        orderBy: { fullName: 'asc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.customer.count({ where }),
    ]);
    return new PaginatedResult(customers, query.take, query.page ?? 1, total);
  }

  async create(
    merchantId: string,
    userId: string,
    dto: CreateCustomerDto,
    metadata: AuditMetadata,
  ) {
    const customer = await this.prisma.customer.create({
      data: {
        merchantId,
        fullName: dto.fullName.trim(),
        phone: dto.phone?.trim(),
        email: dto.email?.trim().toLowerCase(),
        note: dto.note,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        merchantId,
        userId,
        action: 'pos.customer.created',
        entityType: 'customer',
        entityId: customer.id,
        after: { fullName: customer.fullName },
        ...metadata,
      },
    });
    return customer;
  }
}
