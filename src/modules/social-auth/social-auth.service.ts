import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { AuthorizationService } from '#app/modules/authorization/authorization.service';
import { SocialTokenVerifierService } from './social-token-verifier.service';

export type SocialAuthScope = 'merchant' | 'customer';
export type SocialProvider = 'firebase_google' | 'telegram';

export type SocialProfile = {
  email: string | null;
  fullName: string;
  metadata: Record<string, unknown>;
  phone?: string | null;
  provider: SocialProvider;
  providerUserId: string;
};

type AuthIdentityRow = {
  userId: string;
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

  async findOrCreateUser(
    profile: SocialProfile,
    options: { scope: SocialAuthScope },
  ) {
    const ensureMerchant = options.scope === 'merchant';
    const identity = await this.findAuthIdentity(profile);
    if (identity) {
      await this.updateAuthIdentity(profile);
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: identity.userId },
      });
      if (ensureMerchant) await this.ensureSocialMerchant(user, profile);
      return user;
    }

    const email = profile.email
      ? this.normalizeEmail(profile.email)
      : this.socialPlaceholderEmail(profile.provider, profile.providerUserId);
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      await this.createAuthIdentity(this.prisma, {
        email: profile.email ? email : null,
        metadata: profile.metadata,
        phone: profile.phone?.trim() ?? null,
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        userId: existingUser.id,
      });
      if (ensureMerchant)
        await this.ensureSocialMerchant(existingUser, profile);
      return existingUser;
    }

    const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          fullName: profile.fullName.trim(),
          phone: profile.phone?.trim(),
          passwordHash,
        },
      });
      await this.createAuthIdentity(tx, {
        email: profile.email ? email : null,
        metadata: profile.metadata,
        phone: profile.phone?.trim() ?? null,
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        userId: user.id,
      });
      let merchantId: string | undefined;
      if (ensureMerchant) {
        const merchantName = this.socialMerchantName(profile.fullName);
        const slug = await this.createAvailableSlug(merchantName);
        const merchant = await tx.merchant.create({
          data: {
            email: profile.email ? email : null,
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
  }

  private async findAuthIdentity(profile: SocialProfile) {
    const rows = await this.prisma.$queryRaw<AuthIdentityRow[]>`
      SELECT "userId"
      FROM "auth_identities"
      WHERE "provider" = ${profile.provider}
        AND "providerUserId" = ${profile.providerUserId}
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  private async createAuthIdentity(
    client: Pick<PrismaService, '$executeRaw'>,
    data: {
      email: string | null;
      metadata: Record<string, unknown>;
      phone: string | null;
      provider: SocialProvider;
      providerUserId: string;
      userId: string;
    },
  ) {
    const now = new Date();
    const metadata = JSON.stringify(data.metadata);
    await client.$executeRaw`
      INSERT INTO "auth_identities" ("id", "userId", "provider", "providerUserId", "email", "phone", "metadata", "createdAt", "updatedAt")
      VALUES (${randomUUID()}::uuid, ${data.userId}::uuid, ${data.provider}, ${data.providerUserId}, ${data.email}, ${data.phone}, ${metadata}::jsonb, ${now}, ${now})
    `;
  }

  private async updateAuthIdentity(profile: SocialProfile) {
    const email = profile.email ? this.normalizeEmail(profile.email) : null;
    const phone = profile.phone?.trim() ?? null;
    const metadata = JSON.stringify(profile.metadata);
    await this.prisma.$executeRaw`
      UPDATE "auth_identities"
      SET
        "email" = COALESCE(${email}, "email"),
        "phone" = COALESCE(${phone}, "phone"),
        "metadata" = ${metadata}::jsonb,
        "updatedAt" = ${new Date()}
      WHERE "provider" = ${profile.provider}
        AND "providerUserId" = ${profile.providerUserId}
    `;
  }

  private async ensureSocialMerchant(
    user: {
      id: string;
      email: string;
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
          email: profile.email ? user.email : null,
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

  private socialPlaceholderEmail(provider: string, providerUserId: string) {
    const normalizedProvider = provider.replace(/[^a-z0-9]+/gi, '-');
    return `${normalizedProvider}-${providerUserId}@social.local`.toLowerCase();
  }

  private socialMerchantName(fullName: string) {
    return `${fullName.trim() || 'Social user'}'s Store`;
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
