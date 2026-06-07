/* eslint-disable @typescript-eslint/no-unnecessary-condition */
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
} from '@common/responses/pagination.response';

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T | T[];
  meta?: PaginationMeta;
  timestamp: string;
  path: string;
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
          };
        }

        return {
          statusCode,
          message: 'Success',
          data: value as T,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }
}
