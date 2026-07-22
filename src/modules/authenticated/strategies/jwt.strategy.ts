import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

export interface JwtPayload {
  sub: string;
  email: string;
  sessionId: string;
  merchantId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: { user: true },
    });
    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now() ||
      session.user.status !== 'ACTIVE' ||
      session.user.deletedAt
    ) {
      throw new UnauthorizedException('Session is no longer active');
    }

    let merchantName: string | null = null;
    let role: string | null = null;
    let permissions: string[] = [];

    if (payload.merchantId) {
      if (session.merchantId !== payload.merchantId) {
        throw new UnauthorizedException('Merchant session is no longer active');
      }
      const membership = await this.prisma.merchantUser.findUnique({
        where: {
          merchantId_userId: {
            merchantId: payload.merchantId,
            userId: payload.sub,
          },
        },
        include: {
          merchant: true,
          role: {
            include: {
              rolePermissions: { include: { permission: true } },
            },
          },
        },
      });
      if (
        !membership ||
        membership.status !== 'ACTIVE' ||
        membership.merchant.status !== 'ACTIVE'
      ) {
        throw new UnauthorizedException('Merchant access is no longer active');
      }
      merchantName = membership.merchant.name;
      role = membership.role.code;
      permissions = membership.role.rolePermissions.map(
        ({ permission }) => permission.code,
      );
      if (
        ['admin', 'manager', 'owner', 'staff'].includes(membership.role.code)
      ) {
        permissions = [
          ...new Set([...permissions, 'pos.access', 'pos.sale.create']),
        ];
      }
    }

    return {
      id: session.user.id,
      email: session.user.email,
      fullName: session.user.fullName,
      status: session.user.status,
      platformRole: session.user.platformRole,
      sessionId: session.id,
      merchantId: payload.merchantId,
      merchantName,
      role,
      permissions,
    };
  }
}
