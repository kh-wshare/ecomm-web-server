import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { AuthorizationService } from '#app/modules/authorization/authorization.service';
import { SocialAuthService, type SocialProfile } from '../social-auth.service';
import { SocialTokenVerifierService } from '../social-token-verifier.service';

function telegramProfile(providerUserId = '12345'): SocialProfile {
  return {
    telegramId: providerUserId,
    email: null,
    fullName: 'Jane Doe',
    metadata: { username: 'janedoe' },
    phone: null,
    provider: 'telegram',
    providerUserId,
  };
}

describe('SocialAuthService', () => {
  let service: SocialAuthService;
  let prisma: {
    authIdentity: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
    merchant: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let authorization: { listMerchantAccess: jest.Mock };
  let socialTokens: { verifyTelegramMiniAppInitData: jest.Mock };

  beforeEach(async () => {
    prisma = {
      authIdentity: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      merchant: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.user.update.mockImplementation(
      (args: { where: { id: string }; data: Record<string, unknown> }) =>
        Promise.resolve({ id: args.where.id, ...args.data }),
    );
    authorization = { listMerchantAccess: jest.fn().mockResolvedValue([]) };
    socialTokens = { verifyTelegramMiniAppInitData: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        SocialAuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthorizationService, useValue: authorization },
        { provide: SocialTokenVerifierService, useValue: socialTokens },
      ],
    }).compile();

    service = module.get(SocialAuthService);
  });

  describe('findOrCreateUser', () => {
    it('returns the existing user when the identity is already linked', async () => {
      const profile = telegramProfile();
      prisma.authIdentity.findUnique.mockResolvedValue({ userId: 'user-1' });
      prisma.authIdentity.update.mockResolvedValue({});
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        email: null,
        status: 'ACTIVE',
        deletedAt: null,
      });

      const user = await service.findOrCreateUser(profile, {
        scope: 'customer',
      });

      expect(user.id).toBe('user-1');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('backfills telegramId and phone on an account linked before those were captured', async () => {
      const profile: SocialProfile = {
        ...telegramProfile(),
        phone: '+85512345678',
      };
      prisma.authIdentity.findUnique.mockResolvedValue({ userId: 'user-1' });
      prisma.authIdentity.update.mockResolvedValue({});
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        email: null,
        phone: null,
        telegramId: null,
        status: 'ACTIVE',
        deletedAt: null,
      });

      await service.findOrCreateUser(profile, { scope: 'customer' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { telegramId: '12345', phone: '+85512345678' },
      });
    });

    it('merges a Mini App login into an identity created via the Telegram widget flow without creating a duplicate user, preserving prior metadata', async () => {
      // Same real Telegram account, same providerUserId, but the profile
      // shape sent by each flow differs (widget's telegramProfile vs
      // telegramMiniAppProfile) -- login must resolve to the one identity.
      const widgetShapedMetadata = {
        picture: 'https://t.me/i/widget-avatar.jpg',
        issuer: 'https://oauth.telegram.org',
      };
      const miniAppProfile: SocialProfile = {
        telegramId: '12345',
        email: null,
        fullName: 'Jane Doe',
        metadata: { firstName: 'Jane', photoUrl: 'https://t.me/i/mini.jpg' },
        phone: null,
        provider: 'telegram',
        providerUserId: '12345',
      };
      prisma.authIdentity.findUnique.mockResolvedValue({
        userId: 'user-1',
        metadata: widgetShapedMetadata,
      });
      let capturedMetadata: Record<string, unknown> | undefined;
      prisma.authIdentity.update.mockImplementation(
        (args: { data: { metadata: Record<string, unknown> } }) => {
          capturedMetadata = args.data.metadata;
          return Promise.resolve({});
        },
      );
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        status: 'ACTIVE',
        deletedAt: null,
      });

      const user = await service.findOrCreateUser(miniAppProfile, {
        scope: 'customer',
      });

      expect(user.id).toBe('user-1');
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(capturedMetadata).toEqual({
        ...widgetShapedMetadata,
        ...miniAppProfile.metadata,
      });
    });

    it('merges Widget and Mini App logins by telegramId even when their providerUserId values differ', async () => {
      // The widget (OIDC) flow's providerUserId is the OIDC `sub`, which is
      // not the same value as the Mini App's raw Telegram id -- only
      // telegramId is common to both. The lookup must match on telegramId
      // and never fall through to creating a second identity/user.
      const miniAppProfile: SocialProfile = {
        telegramId: '12345',
        email: null,
        fullName: 'Jane Doe',
        metadata: { photoUrl: 'https://t.me/i/mini.jpg' },
        phone: null,
        provider: 'telegram',
        providerUserId: '12345',
      };
      const findUniqueCalls: Array<
        { telegramId: string } | { providerUserId: string }
      > = [];
      prisma.authIdentity.findUnique.mockImplementation(
        (args: {
          where: {
            telegramId?: string;
            provider_providerUserId?: {
              provider: string;
              providerUserId: string;
            };
          };
        }) => {
          if (args.where.telegramId) {
            findUniqueCalls.push({ telegramId: args.where.telegramId });
            return Promise.resolve({
              id: 'identity-1',
              userId: 'user-1',
              metadata: {},
              telegramId: '12345',
            });
          }
          findUniqueCalls.push({
            providerUserId:
              args.where.provider_providerUserId?.providerUserId ?? '',
          });
          return Promise.resolve(null);
        },
      );
      prisma.authIdentity.update.mockResolvedValue({});
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        status: 'ACTIVE',
        deletedAt: null,
      });

      const user = await service.findOrCreateUser(miniAppProfile, {
        scope: 'customer',
      });

      expect(user.id).toBe('user-1');
      expect(prisma.$transaction).not.toHaveBeenCalled();
      // Resolved on the first (telegramId) lookup -- the providerUserId
      // fallback was never needed.
      expect(findUniqueCalls).toEqual([{ telegramId: '12345' }]);
      expect(prisma.authIdentity.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'identity-1' } }),
      );
    });

    it('creates a new user and identity when none exists', async () => {
      const profile = telegramProfile();
      prisma.authIdentity.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);
      const createdUser = {
        id: 'user-2',
        email: 'telegram-12345@social.local',
      };
      let capturedIdentityData: Record<string, unknown> | undefined;
      const tx = {
        user: { create: jest.fn().mockResolvedValue(createdUser) },
        authIdentity: {
          create: jest.fn((args: { data: Record<string, unknown> }) => {
            capturedIdentityData = args.data;
            return Promise.resolve({});
          }),
        },
        auditLog: { create: jest.fn().mockResolvedValue({}) },
      };
      prisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => callback(tx),
      );

      const user = await service.findOrCreateUser(profile, {
        scope: 'customer',
      });

      expect(user).toEqual(createdUser);
      expect(tx.user.create).toHaveBeenCalledTimes(1);
      expect(capturedIdentityData?.telegramId).toBe('12345');
    });

    it('resolves to the winning identity on a concurrent-create race', async () => {
      const profile = telegramProfile();
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['provider', 'providerUserId'] },
      });
      prisma.authIdentity.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ userId: 'user-3' });
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-3',
        status: 'ACTIVE',
        deletedAt: null,
      });

      const user = await service.findOrCreateUser(profile, {
        scope: 'customer',
      });

      expect(user.id).toBe('user-3');
      expect(prisma.authIdentity.findUnique).toHaveBeenCalledTimes(2);
    });
  });

  describe('linkTelegramMiniApp', () => {
    beforeEach(() => {
      socialTokens.verifyTelegramMiniAppInitData.mockResolvedValue({
        id: '12345',
        email: null,
        fullName: 'Jane Doe',
        metadata: { username: 'janedoe' },
        phone: null,
        providerUserId: '12345',
        username: 'janedoe',
      });
    });

    it('rejects linking a Telegram identity already owned by another user', async () => {
      prisma.authIdentity.findUnique.mockResolvedValue({
        userId: 'other-user',
      });

      await expect(
        service.linkTelegramMiniApp('user-1', 'valid-init-data'),
      ).rejects.toThrow(ConflictException);
    });

    it('backfills User.telegramId when re-linking an identity already owned by the caller', async () => {
      prisma.authIdentity.findUnique.mockResolvedValue({
        userId: 'user-1',
        metadata: {},
      });
      prisma.authIdentity.update.mockResolvedValue({});
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        phone: null,
        telegramId: null,
      });

      await service.linkTelegramMiniApp('user-1', 'valid-init-data');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { telegramId: '12345' },
      });
    });

    it('rejects when the current user already has a different Telegram identity linked', async () => {
      prisma.authIdentity.findUnique.mockResolvedValue(null);
      prisma.authIdentity.findFirst.mockResolvedValue({ id: 'identity-1' });

      await expect(
        service.linkTelegramMiniApp('user-1', 'valid-init-data'),
      ).rejects.toThrow(ConflictException);
    });

    it('links the identity and backfills User.telegramId when unowned and not previously linked', async () => {
      prisma.authIdentity.findUnique.mockResolvedValue(null);
      prisma.authIdentity.findFirst.mockResolvedValue(null);
      prisma.authIdentity.create.mockResolvedValue({});
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        phone: null,
        telegramId: null,
      });

      const result = await service.linkTelegramMiniApp(
        'user-1',
        'valid-init-data',
      );

      expect(result).toEqual({ linked: true, provider: 'telegram' });
      expect(prisma.authIdentity.create).toHaveBeenCalledTimes(1);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { telegramId: '12345' },
      });
    });
  });
});
