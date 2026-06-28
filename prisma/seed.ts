import { PrismaClient } from '../src/generated/prisma/client';
import { PlatformRole } from '../src/generated/prisma/enums';
import {
  MerchantRoleCode,
  PERMISSIONS,
  ROLE_PERMISSIONS,
} from '../src/modules/authorization/authorization.constants';
import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const roleNames: Record<MerchantRoleCode, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  staff: 'Staff',
  viewer: 'Viewer',
};

async function main() {
  const passwordHash = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD ?? 'AdminChangeMe123!',
    12,
  );
  const user = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { platformRole: PlatformRole.ADMIN },
    create: {
      email: 'admin@example.com',
      fullName: 'Development Admin',
      passwordHash,
      platformRole: PlatformRole.ADMIN,
    },
  });
  const merchant = await prisma.merchant.upsert({
    where: { slug: 'demo-store' },
    update: {},
    create: {
      name: 'Demo Store',
      slug: 'demo-store',
      email: user.email,
    },
  });

  const permissions = await Promise.all(
    PERMISSIONS.map((code) => {
      const [module, action] = code.split('.');
      return prisma.permission.upsert({
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
    const role = await prisma.role.upsert({
      where: { merchantId_code: { merchantId: merchant.id, code } },
      update: { name: roleNames[code], isSystemRole: true },
      create: {
        merchantId: merchant.id,
        code,
        name: roleNames[code],
        isSystemRole: true,
      },
    });
    roles[code] = role;
    await prisma.rolePermission.createMany({
      data: ROLE_PERMISSIONS[code].map((permissionCode) => ({
        roleId: role.id,
        permissionId: permissionByCode.get(permissionCode)!,
      })),
      skipDuplicates: true,
    });
  }

  await prisma.merchantUser.upsert({
    where: {
      merchantId_userId: { merchantId: merchant.id, userId: user.id },
    },
    update: { roleId: roles.owner.id, status: 'ACTIVE' },
    create: {
      merchantId: merchant.id,
      userId: user.id,
      roleId: roles.owner.id,
      status: 'ACTIVE',
      joinedAt: new Date(),
    },
  });

  console.log('Seeded merchant admin:', {
    email: user.email,
    merchant: merchant.slug,
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
