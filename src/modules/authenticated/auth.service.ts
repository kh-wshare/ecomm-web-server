import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { AuthorizationService } from '#app/modules/authorization/authorization.service';
import {
  SessionMetadata,
  SessionsService,
} from '#app/modules/sessions/sessions.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
    private readonly sessions: SessionsService,
    private readonly jwtService: JwtService,
  ) {}

  async registerMerchant(dto: RegisterDto, metadata: SessionMetadata) {
    const email = this.normalizeEmail(dto.email);
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const slug = await this.createAvailableSlug(dto.merchantName);
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          fullName: dto.fullName.trim(),
          phone: dto.phone?.trim(),
          passwordHash,
        },
      });
      const merchant = await tx.merchant.create({
        data: {
          name: dto.merchantName.trim(),
          slug,
          email,
          phone: dto.phone?.trim(),
        },
      });
      const roles = await this.authorization.createMerchantRoles(
        tx,
        merchant.id,
      );
      await tx.merchantUser.create({
        data: {
          merchantId: merchant.id,
          userId: user.id,
          roleId: roles.owner.id,
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          merchantId: merchant.id,
          userId: user.id,
          action: 'auth.merchant_registered',
          entityType: 'merchant',
          entityId: merchant.id,
        },
      });
      return { user, merchant };
    });

    const { session, refreshToken } = await this.sessions.create(
      result.user.id,
      result.merchant.id,
      metadata,
    );
    return this.authResponse(
      result.user,
      session.id,
      result.merchant.id,
      refreshToken,
    );
  }

  async login(dto: LoginDto, metadata: SessionMetadata) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { email } });
    const validPassword =
      user && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!user || !validPassword || user.status !== 'ACTIVE' || user.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const merchantAccess = await this.authorization.listMerchantAccess(user.id);
    const merchantId = merchantAccess[0]?.merchant.id ?? null;
    const { session, refreshToken } = await this.sessions.create(
      user.id,
      merchantId,
      metadata,
    );
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          merchantId,
          userId: user.id,
          action: 'auth.login',
          entityType: 'session',
          entityId: session.id,
          ...metadata,
        },
      }),
    ]);

    return this.authResponse(
      user,
      session.id,
      merchantId,
      refreshToken,
      merchantAccess,
    );
  }

  async refresh(refreshToken: string) {
    const rotated = await this.sessions.rotate(refreshToken);
    const user = await this.prisma.user.findUnique({
      where: { id: rotated.session.userId },
    });
    if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
      await this.sessions.revoke(rotated.session.id, rotated.session.userId);
      throw new UnauthorizedException('User is no longer active');
    }
    return this.authResponse(
      user,
      rotated.session.id,
      rotated.session.merchantId,
      rotated.refreshToken,
    );
  }

  async switchMerchant(userId: string, sessionId: string, merchantId: string) {
    const membership = await this.authorization.findMembership(
      userId,
      merchantId,
    );
    if (
      !membership ||
      membership.status !== 'ACTIVE' ||
      membership.merchant.status !== 'ACTIVE'
    ) {
      throw new ForbiddenException('Merchant access is not active');
    }
    const session = await this.sessions.setMerchant(
      sessionId,
      userId,
      merchantId,
    );
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return {
      accessToken: this.signAccessToken(
        user.id,
        user.email,
        session.id,
        merchantId,
      ),
      activeMerchant: this.toMerchantAccess(membership),
    };
  }

  async logout(userId: string, sessionId: string) {
    await this.sessions.revoke(sessionId, userId);
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'auth.logout',
        entityType: 'session',
        entityId: sessionId,
      },
    });
    return { success: true };
  }

  async logoutAll(userId: string) {
    await this.sessions.revokeAll(userId);
    return { success: true };
  }

  async currentProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        status: true,
        platformRole: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    return {
      user,
      merchants: await this.authorization.listMerchantAccess(userId),
    };
  }

  private async authResponse(
    user: {
      id: string;
      email: string;
      fullName: string;
      phone: string | null;
      status: string;
      platformRole: string;
    },
    sessionId: string,
    merchantId: string | null,
    refreshToken: string,
    merchantAccess?: Awaited<
      ReturnType<AuthorizationService['listMerchantAccess']>
    >,
  ) {
    const merchants =
      merchantAccess ?? (await this.authorization.listMerchantAccess(user.id));
    const activeMerchant =
      merchants.find((access) => access.merchant.id === merchantId) ?? null;
    if (merchantId && !activeMerchant) {
      await this.sessions.revoke(sessionId, user.id);
      throw new UnauthorizedException('Merchant access is no longer active');
    }
    return {
      accessToken: this.signAccessToken(
        user.id,
        user.email,
        sessionId,
        merchantId,
      ),
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        status: user.status,
        platformRole: user.platformRole,
      },
      activeMerchant,
      merchants,
    };
  }

  private signAccessToken(
    userId: string,
    email: string,
    sessionId: string,
    merchantId: string | null,
  ) {
    const payload: JwtPayload = {
      sub: userId,
      email,
      sessionId,
      merchantId,
    };
    return this.jwtService.sign(payload);
  }

  private toMerchantAccess(
    membership: NonNullable<
      Awaited<ReturnType<AuthorizationService['findMembership']>>
    >,
  ) {
    return {
      merchant: membership.merchant,
      role: membership.role.code,
      permissions: membership.role.rolePermissions.map(
        ({ permission }) => permission.code,
      ),
    };
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
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
