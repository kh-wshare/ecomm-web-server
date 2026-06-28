import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';
import {
  PaginatedResult,
  PaginationMeta,
} from '#app/common/responses/pagination.response';
import { CORRELATION_ID_HEADER } from '#app/common/middleware/correlation-id.middleware';

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T | T[];
  meta?: PaginationMeta;
  timestamp: string;
  path: string;
  correlationId?: string;
}

function isPaginatedResult<T>(value: unknown): value is PaginatedResult<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as PaginatedResult<T>).data) &&
    typeof (value as PaginatedResult<T>).meta === 'object' &&
    (value as PaginatedResult<T>).meta !== null
  );
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const statusCode = ctx.getResponse<Response>().statusCode;
    const correlationId = request.header(CORRELATION_ID_HEADER);

    return next.handle().pipe(
      map((value): ApiResponse<T> => {
        if (isPaginatedResult<T>(value)) {
          return {
            statusCode,
            message: 'Success',
            data: value.data,
            meta: value.meta,
            timestamp: new Date().toISOString(),
            path: request.url,
            correlationId,
          };
        }

        return {
          statusCode,
          message: 'Success',
          data: value as T,
          timestamp: new Date().toISOString(),
          path: request.url,
          correlationId,
        };
      }),
    );
  }
}
