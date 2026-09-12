import { HttpStatus, Injectable } from '@nestjs/common';
import { PosDomainException } from '#app/common/exceptions/pos-domain.exception';
import { Prisma } from '#app/generated/prisma/client';
import {
  PaymentProviderCode,
  PaymentRefundStatus,
  PaymentTransactionStatus,
  PosShiftStatus,
} from '#app/generated/prisma/enums';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { PosDevicesService } from '../devices/devices.service';
import { ClosePosShiftDto, OpenPosShiftDto } from './dto/shift-input.dto';

type AuditMetadata = { ipAddress?: string; userAgent?: string };

@Injectable()
export class PosShiftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly devices: PosDevicesService,
  ) {}

  async open(
    merchantId: string,
    userId: string,
    dto: OpenPosShiftDto,
    metadata: AuditMetadata,
  ) {
    const device = await this.devices.requireActiveDevice(
      merchantId,
      dto.deviceId,
    );

    try {
      return await this.prisma.$transaction(async (tx) => {
        const shift = await tx.posShift.create({
          data: {
            merchantId,
            branchId: device.branchId,
            posDeviceId: device.id,
            openedById: userId,
            status: PosShiftStatus.OPEN,
            openingCash: new Prisma.Decimal(dto.openingCash),
          },
        });
        await tx.auditLog.create({
          data: {
            merchantId,
            userId,
            action: 'pos.session.opened',
            entityType: 'pos_shift',
            entityId: shift.id,
            after: {
              deviceId: device.deviceId,
              branchId: device.branchId,
              openingCash: shift.openingCash.toString(),
            },
            ...metadata,
          },
        });
        return shift;
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new PosDomainException(
          'SHIFT_ALREADY_OPEN',
          `Device '${dto.deviceId}' already has an open shift`,
          HttpStatus.CONFLICT,
          { deviceId: dto.deviceId },
        );
      }
      throw error;
    }
  }

  async current(merchantId: string, deviceId: string) {
    const device = await this.devices.requireActiveDevice(merchantId, deviceId);
    const shift = await this.prisma.posShift.findFirst({
      where: {
        merchantId,
        posDeviceId: device.id,
        status: PosShiftStatus.OPEN,
      },
    });
    if (!shift) {
      // 409, not 404: this is reused by PosOrdersService.create to gate order
      // creation, where "no open shift" is a state precondition, not a
      // missing resource — a 404 there reads as "route not found" and made
      // a client's retry loop very hard to diagnose from a bare status code.
      throw new PosDomainException(
        'SESSION_NOT_OPEN',
        `Device '${deviceId}' has no open shift`,
        HttpStatus.CONFLICT,
        { deviceId },
      );
    }
    return shift;
  }

  async close(
    merchantId: string,
    userId: string,
    shiftId: string,
    dto: ClosePosShiftDto,
    metadata: AuditMetadata,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const shift = await tx.posShift.findFirst({
        where: { id: shiftId, merchantId, status: PosShiftStatus.OPEN },
      });
      if (!shift) {
        throw new PosDomainException(
          'SESSION_NOT_OPEN',
          'Shift is not open',
          HttpStatus.CONFLICT,
          { shiftId },
        );
      }

      const [cashPayments, cashRefunds] = await Promise.all([
        tx.payment.aggregate({
          where: {
            posShiftId: shiftId,
            provider: PaymentProviderCode.CASH,
            status: PaymentTransactionStatus.CONFIRMED,
          },
          _sum: { amount: true },
        }),
        tx.paymentRefund.aggregate({
          where: {
            status: PaymentRefundStatus.SUCCESS,
            payment: {
              posShiftId: shiftId,
              provider: PaymentProviderCode.CASH,
            },
          },
          _sum: { amount: true },
        }),
      ]);

      const openingCash = shift.openingCash;
      const totalCashPayments =
        cashPayments._sum.amount ?? new Prisma.Decimal(0);
      const totalCashRefunds = cashRefunds._sum.amount ?? new Prisma.Decimal(0);
      const expectedCash = openingCash
        .add(totalCashPayments)
        .sub(totalCashRefunds);
      const closingCash = new Prisma.Decimal(dto.closingCash);
      const cashDifference = closingCash.sub(expectedCash);

      const closed = await tx.posShift.update({
        where: { id: shiftId },
        data: {
          status: PosShiftStatus.CLOSED,
          closedById: userId,
          closingCash,
          expectedCash,
          cashDifference,
          note: dto.note,
          closedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          merchantId,
          userId,
          action: 'pos.session.closed',
          entityType: 'pos_shift',
          entityId: shift.id,
          after: {
            openingCash: openingCash.toString(),
            closingCash: closingCash.toString(),
            expectedCash: expectedCash.toString(),
            cashDifference: cashDifference.toString(),
          },
          ...metadata,
        },
      });

      return closed;
    });
  }

  private isUniqueViolation(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
