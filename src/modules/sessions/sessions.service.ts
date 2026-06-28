import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes } from 'node:crypto';
import { PrismaService } from '#app/infrastructure/database/prisma.service';

export type SessionMetadata = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async create(
    userId: string,
    merchantId: string | null,
    metadata: SessionMetadata,
  ) {
    const refreshToken = this.generateToken();
    const ttlDays = this.config.get<number>('jwt.refreshTokenTtlDays', 30);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
    const session = await this.prisma.session.create({
      data: {
        userId,
        merchantId,
        refreshTokenHash: this.hashToken(refreshToken),
        expiresAt,
        ...metadata,
      },
    });
    return { session, refreshToken };
  }

  async rotate(refreshToken: string) {
    const refreshTokenHash = this.hashToken(refreshToken);
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const nextRefreshToken = this.generateToken();
    const updated = await this.prisma.session.updateMany({
      where: {
        id: session.id,
        refreshTokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { refreshTokenHash: this.hashToken(nextRefreshToken) },
    });
    if (updated.count !== 1) {
      throw new UnauthorizedException('Refresh token has already been rotated');
    }
    const updatedSession = await this.prisma.session.findUniqueOrThrow({
      where: { id: session.id },
    });
    return { session: updatedSession, refreshToken: nextRefreshToken };
  }

  async setMerchant(sessionId: string, userId: string, merchantId: string) {
    return this.prisma.session.update({
      where: { id: sessionId, userId, revokedAt: null },
      data: { merchantId },
    });
  }

  async revoke(sessionId: string, userId: string) {
    await this.prisma.session.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAll(userId: string) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private generateToken(): string {
    return randomBytes(48).toString('base64url');
  }

  private hashToken(token: string): string {
    return createHmac(
      'sha256',
      this.config.getOrThrow<string>('jwt.refreshSecret'),
    )
      .update(token)
      .digest('hex');
  }
}
