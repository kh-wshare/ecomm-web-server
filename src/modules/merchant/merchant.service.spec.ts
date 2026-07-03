import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { CommerceCacheService } from '#app/infrastructure/redis/commerce-cache.service';
import { AuthorizationService } from '#app/modules/authorization/authorization.service';
import { MerchantService } from './merchant.service';

describe('MerchantService', () => {
  const merchant = {
    id: 'merchant-1',
    name: 'Acme Store',
    slug: 'acme-store',
    email: 'store@example.com',
    phone: '+15551234567',
    status: 'ACTIVE',
    returnStockOnRefund: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
  };

  const createHarness = () => {
    const merchantCreate = jest.fn().mockResolvedValue(merchant);
    const merchantFindUnique = jest.fn().mockResolvedValue(merchant);
    const merchantUpdate = jest.fn().mockResolvedValue(merchant);
    const membershipCreate = jest
      .fn()
      .mockResolvedValue({ id: 'membership-1' });
    const membershipGroupBy = jest.fn().mockResolvedValue([]);
    const invitationCount = jest.fn().mockResolvedValue(0);
    const auditCreate = jest.fn().mockResolvedValue({ id: 'audit-1' });
    const auditFindMany = jest.fn().mockResolvedValue([]);
    const tx = {
      merchant: {
        create: merchantCreate,
        findUnique: merchantFindUnique,
        update: merchantUpdate,
      },
      merchantUser: { create: membershipCreate },
      auditLog: { create: auditCreate },
    };
    const transaction = jest
      .fn()
      .mockImplementation(
        (operation: (client: typeof tx) => Promise<unknown>) => operation(tx),
      );
    const prisma = {
      $transaction: transaction,
      merchant: { findUnique: merchantFindUnique },
      merchantUser: { groupBy: membershipGroupBy },
      merchantInvitation: { count: invitationCount },
      auditLog: { findMany: auditFindMany },
    } as unknown as PrismaService;
    const createMerchantRoles = jest.fn().mockResolvedValue({
      owner: { id: 'role-owner' },
      admin: { id: 'role-admin' },
      manager: { id: 'role-manager' },
      staff: { id: 'role-staff' },
      viewer: { id: 'role-viewer' },
    });
    const authorization = {
      createMerchantRoles,
    } as unknown as AuthorizationService;
    const dashboardKey = jest
      .fn()
      .mockImplementation((merchantId: string) => `dashboard:${merchantId}`);
    const remember = jest
      .fn()
      .mockImplementation((_key: string, producer: () => Promise<unknown>) =>
        producer(),
      );
    const invalidateDashboard = jest.fn().mockResolvedValue(undefined);
    const cache = {
      dashboardKey,
      remember,
      invalidateDashboard,
    } as unknown as CommerceCacheService;

    return {
      service: new MerchantService(prisma, authorization, cache),
      merchantCreate,
      merchantFindUnique,
      merchantUpdate,
      membershipCreate,
      membershipGroupBy,
      invitationCount,
      auditCreate,
      auditFindMany,
      transaction,
      createMerchantRoles,
      dashboardKey,
      remember,
      invalidateDashboard,
    };
  };

  it('creates a normalized merchant, owner membership, roles, and audit record', async () => {
    const harness = createHarness();

    await expect(
      harness.service.create(
        'user-1',
        {
          name: '  Acme Store  ',
          email: ' STORE@EXAMPLE.COM ',
          phone: ' +15551234567 ',
        },
        { ipAddress: '127.0.0.1', userAgent: 'jest' },
      ),
    ).resolves.toBe(merchant);

    const merchantCreateCalls = harness.merchantCreate.mock
      .calls as unknown as Array<
      [
        {
          data: {
            name: string;
            slug: string;
            email: string;
            phone: string;
          };
        },
      ]
    >;
    expect(merchantCreateCalls[0][0].data).toEqual({
      name: 'Acme Store',
      slug: 'acme-store',
      email: 'store@example.com',
      phone: '+15551234567',
    });
    expect(harness.createMerchantRoles.mock.calls).toHaveLength(1);

    const membershipCalls = harness.membershipCreate.mock
      .calls as unknown as Array<
      [
        {
          data: {
            merchantId: string;
            userId: string;
            roleId: string;
            status: string;
            joinedAt: Date;
          };
        },
      ]
    >;
    expect(membershipCalls[0][0].data).toMatchObject({
      merchantId: merchant.id,
      userId: 'user-1',
      roleId: 'role-owner',
      status: 'ACTIVE',
      joinedAt: expect.any(Date) as Date,
    });
    const auditCalls = harness.auditCreate.mock.calls as unknown as Array<
      [{ data: { action: string; entityId: string; userId: string } }]
    >;
    expect(auditCalls[0][0].data).toMatchObject({
      action: 'merchant.created',
      entityId: merchant.id,
      userId: 'user-1',
    });
  });

  it('retries with a unique suffix when the generated slug conflicts', async () => {
    const harness = createHarness();
    harness.merchantCreate
      .mockRejectedValueOnce({
        code: 'P2002',
        meta: { target: ['slug'] },
      })
      .mockResolvedValueOnce(merchant);

    await expect(
      harness.service.create('user-1', { name: 'Acme Store' }, {}),
    ).resolves.toBe(merchant);

    const calls = harness.merchantCreate.mock.calls as unknown as Array<
      [{ data: { slug: string } }]
    >;
    expect(calls[0][0].data.slug).toBe('acme-store');
    expect(calls[1][0].data.slug).toMatch(/^acme-store-[a-f0-9]{6}$/);
  });

  it('updates a merchant, audits both snapshots, and invalidates dashboard cache', async () => {
    const harness = createHarness();
    const updated = {
      ...merchant,
      name: 'Renamed Store',
      email: 'new@example.com',
      returnStockOnRefund: false,
    };
    harness.merchantUpdate.mockResolvedValue(updated);

    await expect(
      harness.service.updateCurrent(
        merchant.id,
        'user-1',
        {
          name: ' Renamed Store ',
          email: ' NEW@EXAMPLE.COM ',
          returnStockOnRefund: false,
        },
        { userAgent: 'jest' },
      ),
    ).resolves.toBe(updated);

    const updateCalls = harness.merchantUpdate.mock.calls as unknown as Array<
      [
        {
          where: { id: string };
          data: {
            name: string;
            email: string;
            returnStockOnRefund: boolean;
          };
        },
      ]
    >;
    expect(updateCalls[0][0]).toMatchObject({
      where: { id: merchant.id },
      data: {
        name: 'Renamed Store',
        email: 'new@example.com',
        returnStockOnRefund: false,
      },
    });
    expect(harness.invalidateDashboard.mock.calls).toEqual([[merchant.id]]);

    const auditCalls = harness.auditCreate.mock.calls as unknown as Array<
      [
        {
          data: {
            action: string;
            before: { name: string };
            after: { name: string };
          };
        },
      ]
    >;
    expect(auditCalls[0][0].data).toMatchObject({
      action: 'merchant.updated',
      before: { name: merchant.name },
      after: { name: updated.name },
    });
  });

  it('maps update slug conflicts and missing merchants to domain errors', async () => {
    const conflictHarness = createHarness();
    conflictHarness.merchantUpdate.mockRejectedValue({
      code: 'P2002',
      meta: { target: ['slug'] },
    });
    await expect(
      conflictHarness.service.updateCurrent(
        merchant.id,
        'user-1',
        { slug: 'taken-store' },
        {},
      ),
    ).rejects.toThrow(new ConflictException('Merchant slug is already in use'));

    const missingHarness = createHarness();
    missingHarness.merchantFindUnique.mockResolvedValue(null);
    await expect(
      missingHarness.service.findCurrent('missing-merchant'),
    ).rejects.toThrow(new NotFoundException('Merchant not found'));
  });

  it('builds and caches dashboard membership and activity summaries', async () => {
    const harness = createHarness();
    harness.membershipGroupBy.mockResolvedValue([
      { status: 'ACTIVE', _count: { _all: 3 } },
      { status: 'INVITED', _count: { _all: 2 } },
      { status: 'DISABLED', _count: { _all: 1 } },
    ]);
    harness.invitationCount.mockResolvedValue(2);
    const activity = [
      {
        id: 'audit-1',
        action: 'merchant.updated',
        entityType: 'merchant',
        entityId: merchant.id,
        createdAt: new Date('2026-07-02T00:00:00.000Z'),
      },
    ];
    harness.auditFindMany.mockResolvedValue(activity);

    await expect(harness.service.dashboard(merchant.id)).resolves.toEqual({
      merchant,
      memberships: {
        total: 6,
        active: 3,
        invited: 2,
        disabled: 1,
      },
      pendingInvitations: 2,
      recentActivity: activity,
    });
    expect(harness.dashboardKey.mock.calls).toEqual([[merchant.id]]);
    const rememberCalls = harness.remember.mock.calls as unknown as Array<
      [string, () => Promise<unknown>, number]
    >;
    expect(rememberCalls[0][0]).toBe(`dashboard:${merchant.id}`);
    expect(rememberCalls[0][2]).toBe(30);
  });
});
