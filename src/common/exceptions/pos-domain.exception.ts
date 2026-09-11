import { HttpException, HttpStatus } from '@nestjs/common';

export type PosErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'PRODUCT_NOT_FOUND'
  | 'INSUFFICIENT_STOCK'
  | 'ORDER_NOT_FOUND'
  | 'ORDER_ALREADY_CANCELLED'
  | 'PAYMENT_NOT_FOUND'
  | 'PAYMENT_ALREADY_PAID'
  | 'PAYMENT_PENDING'
  | 'DUPLICATE_REQUEST'
  | 'IDEMPOTENCY_KEY_REQUIRED'
  | 'INVALID_ORDER_STATE'
  | 'INVALID_PAYMENT_STATE'
  | 'SYNC_CONFLICT'
  | 'DEVICE_NOT_REGISTERED'
  | 'SESSION_NOT_OPEN'
  | 'SHIFT_ALREADY_OPEN'
  | 'TABLE_UNAVAILABLE';

/**
 * POS-namespaced domain error. `AllExceptionsFilter` already spreads a thrown
 * HttpException's object response body into the final error JSON, so wrapping
 * `{ success: false, error: { code, message, details } }` here is enough to
 * get that exact shape on the wire without touching the shared filter.
 */
export class PosDomainException extends HttpException {
  constructor(
    code: PosErrorCode,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: Record<string, unknown>,
  ) {
    super(
      {
        success: false,
        error: {
          code,
          message,
          ...(details ? { details } : {}),
        },
      },
      statusCode,
    );
  }
}
