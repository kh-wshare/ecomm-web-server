import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { FileStorageService } from '../file-storage/file-storage.service';
import { resolveDashboardRange } from './dashboard.util';
import { CreateReportExportDto } from './dto/report-export.dto';

const EXPORT_TTL_HOURS = 24;

@Injectable()
export class ReportExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FileStorageService,
  ) {}

  async create(merchantId: string, userId: string, dto: CreateReportExportDto) {
    const resolved = resolveDashboardRange(dto.range, dto.from, dto.to);

    try {
      const { rows, headers } = await this.loadDashboardRows(
        merchantId,
        resolved.start,
        resolved.end,
        dto.branchId ?? undefined,
      );
      const csv = toCsv(headers, rows);
      const buffer = Buffer.from(csv, 'utf-8');
      const stored = await this.files.upload(
        {
          buffer,
          originalName: `dashboard-export-${Date.now()}.csv`,
          mimeType: 'text/csv',
          size: buffer.length,
        },
        { merchantId, userId, purpose: 'reports', visibility: 'private' },
      );
      const expiresAt = new Date(
        Date.now() + EXPORT_TTL_HOURS * 60 * 60 * 1000,
      );

      const record = await this.prisma.reportExport.create({
        data: {
          merchantId,
          userId,
          report: dto.report,
          format: dto.format,
          range: dto.range,
          fromDate: resolved.start,
          toDate: resolved.end,
          branchId: dto.branchId ?? null,
          status: 'READY',
          rowCount: rows.length,
          fileKey: stored.key,
          downloadUrl: stored.url,
          expiresAt,
        },
      });
      return this.toResponse(record);
    } catch (error) {
      const record = await this.prisma.reportExport.create({
        data: {
          merchantId,
          userId,
          report: dto.report,
          format: dto.format,
          range: dto.range,
          fromDate: resolved.start,
          toDate: resolved.end,
          branchId: dto.branchId ?? null,
          status: 'FAILED',
          error:
            error instanceof Error ? error.message : 'Export generation failed',
        },
      });
      return this.toResponse(record);
    }
  }

  async findOne(merchantId: string, exportId: string) {
    const record = await this.prisma.reportExport.findFirst({
      where: { id: exportId, merchantId },
    });
    if (!record) throw new NotFoundException('Export not found');
    return this.toResponse(record);
  }

  private async loadDashboardRows(
    merchantId: string,
    start: Date,
    end: Date,
    branchId: string | undefined,
  ) {
    const orders = await this.prisma.order.findMany({
      where: {
        merchantId,
        createdAt: { gte: start, lte: end },
        ...(branchId ? { branchId } : {}),
      },
      orderBy: { createdAt: 'asc' },
      select: {
        orderNumber: true,
        createdAt: true,
        sourceChannel: true,
        status: true,
        paymentStatus: true,
        fulfillmentStatus: true,
        customerName: true,
        customerEmail: true,
        subtotalAmount: true,
        discountAmount: true,
        shippingAmount: true,
        feeAmount: true,
        totalAmount: true,
        currency: true,
        branch: { select: { name: true } },
        _count: { select: { items: true } },
      },
    });

    const headers = [
      'Order Number',
      'Date',
      'Branch',
      'Channel',
      'Status',
      'Payment Status',
      'Fulfillment Status',
      'Customer Name',
      'Customer Email',
      'Items',
      'Subtotal',
      'Discount',
      'Shipping',
      'Fee',
      'Total',
      'Currency',
    ];

    const rows = orders.map((order) => [
      order.orderNumber,
      order.createdAt.toISOString(),
      order.branch?.name ?? '',
      order.sourceChannel,
      order.status,
      order.paymentStatus,
      order.fulfillmentStatus,
      order.customerName ?? '',
      order.customerEmail ?? '',
      String(order._count.items),
      order.subtotalAmount.toFixed(2),
      order.discountAmount.toFixed(2),
      order.shippingAmount.toFixed(2),
      order.feeAmount.toFixed(2),
      order.totalAmount.toFixed(2),
      order.currency,
    ]);

    return { headers, rows };
  }

  private toResponse(record: {
    id: string;
    status: string;
    rowCount: number | null;
    downloadUrl: string | null;
    expiresAt: Date | null;
    error: string | null;
  }) {
    return {
      id: record.id,
      status: record.status as 'READY' | 'FAILED',
      rowCount: record.rowCount,
      downloadUrl: record.downloadUrl,
      expiresAt: record.expiresAt?.toISOString() ?? null,
      error: record.error,
    };
  }
}

function toCsv(headers: string[], rows: string[][]) {
  const lines = [headers, ...rows].map((line) =>
    line.map(escapeCsvValue).join(','),
  );
  return lines.join('\r\n');
}

function escapeCsvValue(value: string) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
