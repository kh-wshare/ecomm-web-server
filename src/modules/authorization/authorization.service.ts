import { Injectable } from '@nestjs/common';
import { Prisma } from '#app/generated/prisma/client';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import {
  MerchantRoleCode,
  PERMISSIONS,
  ROLE_PERMISSIONS,
} from './authorization.constants';

const ROLE_NAMES: Record<MerchantRoleCode, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  staff: 'Staff',
  viewer: 'Viewer',
};

@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async createMerchantRoles(tx: Prisma.TransactionClient, merchantId: string) {
    const permissions = await Promise.all(
      PERMISSIONS.map((code) => {
        const [module, action] = code.split('.');
        return tx.permission.upsert({
          where: { code },
          update: { module, action },
          create: { code, module, action },
        });
      }),
    );

    const permissionByCode = new Map(
      permissions.map((permission) => [permission.code, permission.id]),
    );
    const roles = {} as Record<MerchantRoleCode, { id: string }>;

    for (const code of Object.keys(ROLE_PERMISSIONS) as MerchantRoleCode[]) {
      const role = await tx.role.create({
        data: {
          merchantId,
          code,
          name: ROLE_NAMES[code],
          isSystemRole: true,
        },
        select: { id: true },
      });
      roles[code] = role;

      await tx.rolePermission.createMany({
        data: ROLE_PERMISSIONS[code].map((permissionCode) => ({
          roleId: role.id,
          permissionId: permissionByCode.get(permissionCode)!,
        })),
      });
    }

    return roles;
  }

  findMembership(userId: string, merchantId: string) {
    return this.prisma.merchantUser.findUnique({
      where: { merchantId_userId: { merchantId, userId } },
      include: {
        merchant: true,
        role: {
          include: {
            rolePermissions: { include: { permission: true } },
          },
        },
      },
    });
  }

  async listMerchantAccess(userId: string) {
    const memberships = await this.prisma.merchantUser.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        merchant: { status: 'ACTIVE' },
      },
      include: {
        merchant: true,
        role: {
          include: {
            rolePermissions: { include: { permission: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((membership) => ({
      merchant: membership.merchant,
      role: membership.role.code,
      permissions: membership.role.rolePermissions.map(
        ({ permission }) => permission.code,
      ),
    }));
  }
}
