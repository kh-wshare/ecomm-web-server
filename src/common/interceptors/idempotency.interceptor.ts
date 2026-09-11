import { createHash } from 'node:crypto';
import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { from, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Prisma } from '#app/generated/prisma/client';
import { IdempotencyKeyStatus } from '#app/generated/prisma/enums';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { AuthenticatedUser } from '#app/modules/authenticated/interfaces/authenticated-user.interface';
import { IDEMPOTENT_SCOPE_KEY } from '../decorators/idempotent.decorator';
import { PosDomainException } from '../exceptions/pos-domain.exception';
import { shouldRetryIdempotencyKey } from '../idempotency-policy';

function hashRequestBody(body: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(body ?? {}))
    .digest('hex');
}

/**
 * Generic, Postgres-backed idempotency guard for POS mutation endpoints.
 * Only activates on routes decorated with `@Idempotent(scope)` — everything
 * else passes through untouched. Registered globally (APP_INTERCEPTOR) so
 * every module gets the same guarantee without individually wiring it up.
 *
 * Deliberately not Redis-backed: per the `CommerceCacheService` fail-soft
 * convention, a cache that can be unavailable must never be the source of
 * truth for something this correctness-critical.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> | Promise<Observable<unknown>> {
    const scope = this.reflector.getAllAndOverride<string | undefined>(
      IDEMPOTENT_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!scope) return next.handle();

    return this.handleIdempotent(scope, context, next);
  }

  private async handleIdempotent(
    scope: string,
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const httpCtx = context.switchToHttp();
    const request = httpCtx.getRequest<
      Request & { user?: AuthenticatedUser }
    >();
    const response = httpCtx.getResponse<Response>();

    const key = request.header('Idempotency-Key');
    if (!key) {
      throw new PosDomainException(
        'IDEMPOTENCY_KEY_REQUIRED',
        'Idempotency-Key header is required for this request',
        HttpStatus.BAD_REQUEST,
      );
    }

    const merchantId = request.user?.merchantId;
    if (!merchantId) {
      throw new PosDomainException(
        'UNAUTHORIZED',
        'Merchant context is required',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const requestHash = hashRequestBody(request.body);
    const where = { merchantId_scope_key: { merchantId, scope, key } };

    try {
      await this.prisma.idempotencyKey.create({
        data: {
          merchantId,
          scope,
          key,
          requestHash,
          status: IdempotencyKeyStatus.IN_PROGRESS,
        },
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      ) {
        throw error;
      }

      const existing = await this.prisma.idempotencyKey.findUniqueOrThrow({
        where,
      });

      if (existing.requestHash && existing.requestHash !== requestHash) {
        throw new PosDomainException(
          'DUPLICATE_REQUEST',
          'This Idempotency-Key was already used with a different request payload',
          HttpStatus.CONFLICT,
          { scope, key },
        );
      }

      if (existing.status === IdempotencyKeyStatus.IN_PROGRESS) {
        throw new PosDomainException(
          'DUPLICATE_REQUEST',
          'A request with this Idempotency-Key is already in progress',
          HttpStatus.CONFLICT,
          { scope, key },
        );
      }

      if (existing.status === IdempotencyKeyStatus.COMPLETED) {
        response.status(existing.responseStatus ?? HttpStatus.OK);
        return of(existing.responseBody);
      }

      if (!shouldRetryIdempotencyKey(existing.status)) {
        throw new PosDomainException(
          'DUPLICATE_REQUEST',
          'This Idempotency-Key cannot be reused',
          HttpStatus.CONFLICT,
          { scope, key },
        );
      }

      await this.prisma.idempotencyKey.update({
        where,
        data: { status: IdempotencyKeyStatus.IN_PROGRESS, requestHash },
      });
    }

    return next.handle().pipe(
      // Must await the COMPLETED write before letting the response reach the
      // client — otherwise a fast retry can race ahead of this fire-and-forget
      // update and see a stale IN_PROGRESS row (observed while smoke-testing).
      switchMap((value: unknown) =>
        from(
          this.prisma.idempotencyKey.update({
            where,
            data: {
              status: IdempotencyKeyStatus.COMPLETED,
              responseStatus: response.statusCode,
              responseBody: (value ?? null) as Prisma.InputJsonValue,
            },
          }),
        ).pipe(map(() => value)),
      ),
      catchError((error: unknown) =>
        from(
          this.prisma.idempotencyKey.update({
            where,
            data: { status: IdempotencyKeyStatus.FAILED },
          }),
        ).pipe(switchMap(() => throwError(() => error))),
      ),
    );
  }
}
