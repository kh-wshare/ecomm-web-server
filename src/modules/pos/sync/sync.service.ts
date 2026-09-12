import { HttpStatus, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PosDomainException } from '#app/common/exceptions/pos-domain.exception';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { CreatePosOrderDto } from '../orders/dto/pos-order-input.dto';
import { PosOrdersService } from '../orders/pos-orders.service';
import { SyncBatchDto, SyncOperationDto } from './dto/sync-input.dto';

type AuditMetadata = { ipAddress?: string; userAgent?: string };

const SYNC_BATCH_LIMIT = 200;

@Injectable()
export class PosSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly posOrders: PosOrdersService,
  ) {}

  /**
   * Cursor-based incremental sync. Simplified relative to a true per-entity
   * keyset cursor: the opaque cursor is a base64 "changed since" timestamp,
   * and each entity list is capped per page with `hasMore` signaling the
   * client to re-poll with the returned cursor for the next slice.
   */
  async sync(merchantId: string, cursor?: string) {
    const since = this.decodeCursor(cursor);
    const take = SYNC_BATCH_LIMIT;

    const [products, categories, inventory, tables, orders, payments] =
      await Promise.all([
        this.prisma.product.findMany({
          where: { merchantId, updatedAt: { gt: since } },
          include: { variants: true },
          orderBy: { updatedAt: 'asc' },
          take,
        }),
        this.prisma.productCategory.findMany({
          where: { merchantId, updatedAt: { gt: since } },
          orderBy: { updatedAt: 'asc' },
          take,
        }),
        this.prisma.inventoryStock.findMany({
          where: { merchantId, updatedAt: { gt: since } },
          orderBy: { updatedAt: 'asc' },
          take,
        }),
        this.prisma.posTable.findMany({
          where: { merchantId, updatedAt: { gt: since } },
          orderBy: { updatedAt: 'asc' },
          take,
        }),
        this.prisma.order.findMany({
          where: {
            merchantId,
            updatedAt: { gt: since },
            posDeviceId: { not: null },
          },
          include: { items: true },
          orderBy: { updatedAt: 'asc' },
          take,
        }),
        this.prisma.payment.findMany({
          where: { merchantId, updatedAt: { gt: since } },
          orderBy: { updatedAt: 'asc' },
          take,
        }),
      ]);

    const batches = [products, categories, inventory, tables, orders, payments];
    const hasMore = batches.some((rows) => rows.length === take);
    const maxUpdatedAt = batches
      .flat()
      .reduce(
        (max: Date, row: { updatedAt: Date }) =>
          row.updatedAt > max ? row.updatedAt : max,
        since,
      );

    return {
      cursor: this.encodeCursor(maxUpdatedAt),
      changes: { products, categories, inventory, tables, orders, payments },
      hasMore,
    };
  }

  /**
   * Applies a batch of offline-queued operations. Each operation gets its
   * own try/catch so one bad operation never fails the whole batch — the
   * caller gets a per-operation SUCCESS/FAILED/CONFLICT result, per the
   * offline-sync spec. Only CREATE_ORDER is wired up today; extending to
   * more operation types is mechanical (add a case that calls the matching
   * POS service, same as CREATE_ORDER does).
   */
  async batch(
    merchantId: string,
    userId: string,
    dto: SyncBatchDto,
    metadata: AuditMetadata,
  ) {
    const results = await Promise.all(
      dto.operations.map((operation) =>
        this.applyOperation(
          merchantId,
          userId,
          dto.deviceId,
          operation,
          metadata,
        ),
      ),
    );
    const cursor = await this.sync(merchantId);
    return { results, cursor: cursor.cursor };
  }

  private async applyOperation(
    merchantId: string,
    userId: string,
    deviceId: string,
    operation: SyncOperationDto,
    metadata: AuditMetadata,
  ) {
    try {
      switch (operation.type) {
        case 'CREATE_ORDER': {
          const dto = await this.toValidDto(CreatePosOrderDto, {
            deviceId,
            ...operation.payload,
          });
          const created = await this.posOrders.create(
            merchantId,
            userId,
            dto,
            metadata,
          );
          return {
            operationId: operation.id,
            status: 'SUCCESS' as const,
            serverId: created.id,
          };
        }
        default:
          return {
            operationId: operation.id,
            status: 'FAILED' as const,
            error: {
              code: 'UNSUPPORTED_OPERATION',
              message: `Unsupported operation type: ${String(operation.type)}`,
            },
          };
      }
    } catch (error) {
      if (error instanceof PosDomainException) {
        const body = error.getResponse() as {
          error: { code: string; message: string };
        };
        const status: number = error.getStatus();
        const isConflict = status === Number(HttpStatus.CONFLICT);
        return {
          operationId: operation.id,
          status: isConflict ? 'CONFLICT' : 'FAILED',
          error: body.error,
        };
      }
      return {
        operationId: operation.id,
        status: 'FAILED' as const,
        error: {
          code: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  private async toValidDto<T extends object>(
    cls: new () => T,
    plain: unknown,
  ): Promise<T> {
    const instance = plainToInstance(cls, plain);
    const errors = await validate(instance as object);
    if (errors.length) {
      throw new PosDomainException(
        'INVALID_ORDER_STATE',
        `Invalid operation payload: ${errors.map((e) => Object.values(e.constraints ?? {}).join(', ')).join('; ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return instance;
  }

  private decodeCursor(cursor?: string): Date {
    if (!cursor) return new Date(0);
    try {
      return new Date(Buffer.from(cursor, 'base64url').toString('utf8'));
    } catch {
      return new Date(0);
    }
  }

  private encodeCursor(value: Date) {
    return Buffer.from(value.toISOString()).toString('base64url');
  }
}
