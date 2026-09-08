import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import type { Prisma, User } from '#app/generated/prisma/client';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { AuthorizationService } from '#app/modules/authorization/authorization.service';
import { SocialTokenVerifierService } from './social-token-verifier.service';

export type SocialAuthScope = 'merchant' | 'customer';
export type SocialProvider = 'firebase_google' | 'telegram';

export type SocialProfile = {
  telegramId?: string | null;
  email: string | null;
  fullName: string;
  metadata: Record<string, unknown>;
  phone?: string | null;
  provider: SocialProvider;
  providerUserId: string;
};

@Injectable()
export class SocialAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
    private readonly socialTokens: SocialTokenVerifierService,
  ) {}

  async firebaseGoogleProfile(idToken: string): Promise<SocialProfile> {
    const profile =
      await this.socialTokens.verifyFirebaseGoogleIdToken(idToken);
    return {
      email: profile.email,
      fullName: profile.fullName,
      metadata: profile.metadata,
      provider: 'firebase_google',
      providerUserId: profile.providerUserId,
    };
  }

  async telegramProfile(idToken: string): Promise<SocialProfile> {
    const profile = await this.socialTokens.verifyTelegramIdToken(idToken);
    return {
      // The OIDC token's own `id` claim is the real Telegram user id;
      // `sub`/providerUserId is the OIDC subject and is not the same value.
      telegramId: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      metadata: {
        ...profile.metadata,
        username: profile.username,
      },
      phone: profile.phone,
      provider: 'telegram',
      providerUserId: profile.providerUserId,
    };
  }

  async telegramMiniAppProfile(initData: string): Promise<SocialProfile> {
    const profile =
      await this.socialTokens.verifyTelegramMiniAppInitData(initData);
    return {
      telegramId: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      metadata: {
        ...profile.metadata,
        username: profile.username,
      },
      phone: profile.phone,
      provider: 'telegram',
      providerUserId: profile.providerUserId,
    };
  }

  async linkTelegramMiniApp(userId: string, initData: string) {
    const profile = await this.telegramMiniAppProfile(initData);
    const existing = await this.findAuthIdentity(profile);
    if (existing) {
      if (existing.userId !== userId) {
        throw new ConflictException({
          message: 'This Telegram account is already linked to another user',
          code: 'TELEGRAM_ACCOUNT_LINK_CONFLICT',
        });
      }
      await this.updateAuthIdentity(
        existing.id,
        profile,
        existing.metadata,
        existing.telegramId,
      );
      await this.syncUserTelegramFields(userId, profile);
      return { linked: true, provider: profile.provider };
    }

    const alreadyLinked = await this.prisma.authIdentity.findFirst({
      where: { userId, provider: profile.provider },
      select: { id: true },
    });
    if (alreadyLinked) {
      throw new ConflictException({
        message: 'Your account is already linked to a Telegram account',
        code: 'TELEGRAM_ACCOUNT_ALREADY_LINKED',
      });
    }

    try {
      await this.createAuthIdentity(this.prisma, {
        email: null,
        metadata: profile.metadata,
        phone: profile.phone?.trim() ?? null,
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        telegramId: profile.telegramId,
        userId,
      });
    } catch (error) {
      if (this.isAuthIdentityConflict(error)) {
        throw new ConflictException({
          message: 'This Telegram account is already linked to another user',
          code: 'TELEGRAM_ACCOUNT_LINK_CONFLICT',
        });
      }
      throw error;
    }
    await this.syncUserTelegramFields(userId, profile);
    return { linked: true, provider: profile.provider };
  }

  private async syncUserTelegramFields(userId: string, profile: SocialProfile) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    await this.syncTelegramFields(user, profile);
  }

  exchangeTelegramCode(options: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }) {
    return this.socialTokens.exchangeTelegramCode(options);
  }

  async findOrCreateUser(
    profile: SocialProfile,
    options: { scope: SocialAuthScope },
  ) {
    const ensureMerchant = options.scope === 'merchant';
    const identity = await this.findAuthIdentity(profile);
    if (identity) {
      await this.updateAuthIdentity(
        identity.id,
        profile,
        identity.metadata,
        identity.telegramId,
      );
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: identity.userId },
      });
      const syncedUser = await this.syncTelegramFields(user, profile);
      if (ensureMerchant) await this.ensureSocialMerchant(syncedUser, profile);
      return syncedUser;
    }

    // Telegram never supplies a real email, so there's no email to match an
    // existing account against -- only Firebase (which always supplies one)
    // takes this branch. Matching by username/name is deliberately not done.
    const email = profile.email ? this.normalizeEmail(profile.email) : null;
    const existingUser = email
      ? await this.prisma.user.findUnique({ where: { email } })
      : null;
    if (existingUser) {
      await this.createAuthIdentity(this.prisma, {
        email,
        metadata: profile.metadata,
        phone: profile.phone?.trim() ?? null,
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        telegramId: profile.telegramId,
        userId: existingUser.id,
      });
      const syncedUser = await this.syncTelegramFields(existingUser, profile);
      if (ensureMerchant) await this.ensureSocialMerchant(syncedUser, profile);
      return syncedUser;
    }

    const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
    const telegramId =
      profile.provider === 'telegram' ? profile.telegramId : undefined;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            fullName: profile.fullName.trim(),
            phone: profile.phone?.trim(),
            telegramId,
            passwordHash,
          },
        });
        await this.createAuthIdentity(tx, {
          email,
          metadata: profile.metadata,
          phone: profile.phone?.trim() ?? null,
          provider: profile.provider,
          providerUserId: profile.providerUserId,
          telegramId: profile.telegramId,
          userId: user.id,
        });
        let merchantId: string | undefined;
        if (ensureMerchant) {
          const merchantName = this.socialMerchantName(profile.fullName);
          const slug = await this.createAvailableSlug(merchantName);
          const merchant = await tx.merchant.create({
            data: {
              email,
              name: merchantName,
              phone: profile.phone?.trim(),
              slug,
            },
          });
          const roles = await this.authorization.createMerchantRoles(
            tx,
            merchant.id,
          );
          await tx.merchantUser.create({
            data: {
              joinedAt: new Date(),
              merchantId: merchant.id,
              roleId: roles.owner.id,
              status: 'ACTIVE',
              userId: user.id,
            },
          });
          merchantId = merchant.id;
        }
        await tx.auditLog.create({
          data: {
            merchantId,
            userId: user.id,
            action: 'auth.social_user_created',
            entityType: 'user',
            entityId: user.id,
            after: {
              provider: profile.provider,
              scope: options.scope,
            },
          },
        });
        return user;
      });
    } catch (error) {
      if (!this.isAuthIdentityConflict(error)) throw error;
      // A concurrent request won the race and created this identity first.
      const identity = await this.findAuthIdentity(profile);
      if (!identity) throw error;
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: identity.userId },
      });
      const syncedUser = await this.syncTelegramFields(user, profile);
      if (ensureMerchant) await this.ensureSocialMerchant(syncedUser, profile);
      return syncedUser;
    }
  }

  /**
   * Backfills `telegramId` and `phone` onto an existing User the first time
   * a Telegram login provides them (e.g. an account created before this
   * column existed, or before Telegram shared a phone number).
   */
  private async syncTelegramFields(
    user: User,
    profile: SocialProfile,
  ): Promise<User> {
    if (profile.provider !== 'telegram') return user;
    const data: Prisma.UserUpdateInput = {};
    if (!user.telegramId) data.telegramId = profile.telegramId;
    const trimmedPhone = profile.phone?.trim();
    if (!user.phone && trimmedPhone) data.phone = trimmedPhone;
    if (Object.keys(data).length === 0) return user;
    return this.prisma.user.update({ where: { id: user.id }, data });
  }

  /**
   * Resolves an existing identity for this profile. For Telegram, the
   * Widget (OIDC) and Mini App flows report different `providerUserId`
   * values for the same real account (OIDC `sub` vs. the raw Telegram id),
   * so `telegramId` -- the one value both flows agree on -- is tried first.
   * Only a brand-new identity (neither lookup matches) falls through to
   * `createAuthIdentity`, keyed by whichever flow logged in first.
   */
  private async findAuthIdentity(profile: SocialProfile) {
    if (profile.provider === 'telegram' && profile.telegramId) {
      const byTelegramId = await this.prisma.authIdentity.findUnique({
        select: { id: true, userId: true, metadata: true, telegramId: true },
        where: { telegramId: profile.telegramId },
      });
      if (byTelegramId) return byTelegramId;
    }
    return this.prisma.authIdentity.findUnique({
      select: { id: true, userId: true, metadata: true, telegramId: true },
      where: {
        provider_providerUserId: {
          provider: profile.provider,
          providerUserId: profile.providerUserId,
        },
      },
    });
  }

  private async createAuthIdentity(
    client: Pick<Prisma.TransactionClient, 'authIdentity'>,
    data: {
      email: string | null;
      metadata: Record<string, unknown>;
      phone: string | null;
      provider: SocialProvider;
      providerUserId: string;
      telegramId?: string | null;
      userId: string;
    },
  ) {
    await client.authIdentity.create({
      data: {
        email: data.email,
        metadata: data.metadata as Prisma.InputJsonValue,
        phone: data.phone,
        provider: data.provider,
        providerUserId: data.providerUserId,
        telegramId:
          data.provider === 'telegram' ? (data.telegramId ?? null) : null,
        userId: data.userId,
      },
    });
  }

  private async updateAuthIdentity(
    identityId: string,
    profile: SocialProfile,
    previousMetadata?: Prisma.JsonValue | null,
    previousTelegramId?: string | null,
  ) {
    const email = profile.email ? this.normalizeEmail(profile.email) : null;
    const phone = profile.phone?.trim() ?? null;
    // Merge rather than replace: the widget (OIDC) and Mini App flows share
    // the same `telegram` identity but capture different profile fields, so
    // switching between them shouldn't erase what the other one recorded.
    const mergedMetadata = {
      ...(this.isJsonObject(previousMetadata) ? previousMetadata : {}),
      ...profile.metadata,
    };
    await this.prisma.authIdentity.update({
      data: {
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
        ...(!previousTelegramId && profile.telegramId
          ? { telegramId: profile.telegramId }
          : {}),
        metadata: mergedMetadata as Prisma.InputJsonValue,
      },
      where: { id: identityId },
    });
  }

  private isJsonObject(
    value: Prisma.JsonValue | null | undefined,
  ): value is Prisma.JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private async ensureSocialMerchant(
    user: {
      id: string;
      email: string | null;
      fullName: string;
      phone: string | null;
    },
    profile: SocialProfile,
  ) {
    const merchantAccess = await this.authorization.listMerchantAccess(user.id);
    if (merchantAccess.length) return;

    const merchantName = this.socialMerchantName(user.fullName);
    const slug = await this.createAvailableSlug(merchantName);
    await this.prisma.$transaction(async (tx) => {
      const merchant = await tx.merchant.create({
        data: {
          email: user.email,
          name: merchantName,
          phone: user.phone,
          slug,
        },
      });
      const roles = await this.authorization.createMerchantRoles(
        tx,
        merchant.id,
      );
      await tx.merchantUser.create({
        data: {
          joinedAt: new Date(),
          merchantId: merchant.id,
          roleId: roles.owner.id,
          status: 'ACTIVE',
          userId: user.id,
        },
      });
      await tx.auditLog.create({
        data: {
          merchantId: merchant.id,
          userId: user.id,
          action: 'auth.social_merchant_created',
          entityType: 'merchant',
          entityId: merchant.id,
          after: { provider: profile.provider },
        },
      });
    });
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private socialMerchantName(fullName: string) {
    return `${fullName.trim() || 'Social user'}'s Store`;
  }

  private isAuthIdentityConflict(error: unknown) {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
      return false;
    }
    const prismaError = error as { code: unknown; meta?: { target?: unknown } };
    // Either the compound (provider, providerUserId) key or the standalone
    // telegramId key can collide on a concurrent first-time signup.
    return (
      prismaError.code === 'P2002' &&
      (prismaError.meta?.target === undefined ||
        JSON.stringify(prismaError.meta.target).includes('provider') ||
        JSON.stringify(prismaError.meta.target).includes('telegramId'))
    );
  }

  private async createAvailableSlug(name: string) {
    const base =
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'merchant';
    const exists = await this.prisma.merchant.findUnique({
      where: { slug: base },
      select: { id: true },
    });
    return exists ? `${base}-${randomBytes(3).toString('hex')}` : base;
  }
}
