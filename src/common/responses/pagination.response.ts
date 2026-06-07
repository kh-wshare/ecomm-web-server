import { ApiProperty } from '@nestjs/swagger';

export class PaginationMeta {
  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 10 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNext: boolean;

  @ApiProperty({ example: false })
  hasPrev: boolean;

  constructor(limit: number, page: number, total: number) {
    this.limit = limit;
    this.page = page;
    this.total = total;
    this.totalPages = Math.ceil(total / limit);
    this.hasNext = page < this.totalPages;
    this.hasPrev = page > 1;
  }
}

export class PaginatedResult<T> {
  readonly data: T[];
  readonly meta: PaginationMeta;

  constructor(data: T[], limit: number, page: number, total: number) {
    this.data = data;
    this.meta = new PaginationMeta(limit, page, total);
  }

  // Static type guard — self-contained, no magic strings
  static is<T>(value: unknown): value is PaginatedResult<T> {
    return (
      value instanceof PaginatedResult ||
      (typeof value === 'object' &&
        value !== null &&
        'data' in value &&
        'meta' in value &&
        value.meta instanceof PaginationMeta)
    );
  }
}

export { PaginatedResult as PaginationResult };
export { PaginatedResult as SuccessWithPagination };
