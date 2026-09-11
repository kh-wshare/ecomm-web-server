import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { PosDomainException } from '#app/common/exceptions/pos-domain.exception';
import { PosDeviceStatus } from '#app/generated/prisma/enums';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import {
  PosDeviceQueryDto,
  RegisterPosDeviceDto,
} from './dto/device-input.dto';

const deviceSelect = {
  id: true,
  deviceId: true,
  branchId: true,
  name: true,
  platform: true,
  appVersion: true,
  status: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

type AuditMetadata = { ipAddress?: string; userAgent?: string };

@Injectable()
export class PosDevicesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(merchantId: string, query: PosDeviceQueryDto) {
    return this.prisma.posDevice.findMany({
      where: {
        merchantId,
        deletedAt: null,
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      select: deviceSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async register(
    merchantId: string,
    userId: string,
    dto: RegisterPosDeviceDto,
    metadata: AuditMetadata,
  ) {
    const branch = await this.prisma.merchantBranch.findFirst({
      where: {
        id: dto.branchId,
        merchantId,
        status: 'ACTIVE',
        deletedAt: null,
      },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    return this.prisma.$transaction(async (tx) => {
      const device = await tx.posDevice.upsert({
        where: { merchantId_deviceId: { merchantId, deviceId: dto.deviceId } },
        create: {
          merchantId,
          deviceId: dto.deviceId,
          branchId: dto.branchId,
          name: dto.deviceName,
          platform: dto.platform,
          appVersion: dto.appVersion,
          status: PosDeviceStatus.ACTIVE,
          lastSeenAt: new Date(),
          registeredById: userId,
        },
        update: {
          branchId: dto.branchId,
          name: dto.deviceName,
          platform: dto.platform,
          appVersion: dto.appVersion,
          status: PosDeviceStatus.ACTIVE,
          lastSeenAt: new Date(),
          deletedAt: null,
        },
        select: deviceSelect,
      });
      await tx.auditLog.create({
        data: {
          merchantId,
          userId,
          action: 'pos.device.registered',
          entityType: 'pos_device',
          entityId: device.id,
          after: { deviceId: device.deviceId, branchId: device.branchId },
          ...metadata,
        },
      });
      return device;
    });
  }

  /**
   * Resolves a client-supplied deviceId (e.g. "POS-DEVICE-001") to the
   * server-side registered, ACTIVE `PosDevice` row for this merchant.
   * Shared by every POS submodule that needs to validate a device before
   * allowing a mutation (shifts, orders, kitchen, payments, realtime auth).
   */
  async requireActiveDevice(merchantId: string, deviceId: string) {
    const device = await this.prisma.posDevice.findFirst({
      where: {
        merchantId,
        deviceId,
        status: PosDeviceStatus.ACTIVE,
        deletedAt: null,
      },
    });
    if (!device) {
      throw new PosDomainException(
        'DEVICE_NOT_REGISTERED',
        `Device '${deviceId}' is not registered or is inactive`,
        HttpStatus.CONFLICT,
        { deviceId },
      );
    }
    return device;
  }
}
