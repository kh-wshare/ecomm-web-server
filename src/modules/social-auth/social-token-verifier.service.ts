import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPublicKey, verify } from 'node:crypto';

type JwtHeader = {
  alg?: string;
  kid?: string;
};

type JwtPayload = {
  aud?: string | string[];
  email?: string;
  email_verified?: boolean;
  exp?: number;
  firebase?: { sign_in_provider?: string };
  iat?: number;
  iss?: string;
  name?: string;
  phone_number?: string;
  picture?: string;
  preferred_username?: string;
  sub?: string;
  user_id?: string;
};

export type VerifiedFirebaseGoogleUser = {
  email: string;
  fullName: string;
  metadata: Record<string, unknown>;
  providerUserId: string;
};

export type VerifiedTelegramUser = {
  email: string | null;
  fullName: string;
  metadata: Record<string, unknown>;
  phone: string | null;
  providerUserId: string;
  username: string | null;
};

@Injectable()
export class SocialTokenVerifierService {
  private firebaseCertificates = new Map<string, string>();
  private firebaseCertificatesExpireAt = 0;
  private telegramKeys = new Map<string, unknown>();
  private telegramKeysExpireAt = 0;

  constructor(private readonly config: ConfigService) {}

  async verifyFirebaseGoogleIdToken(
    idToken: string,
  ): Promise<VerifiedFirebaseGoogleUser> {
    const projectId = this.config.get<string>('socialAuth.firebaseProjectId');
    if (!projectId) {
      throw new ServiceUnavailableException('Firebase login is not configured');
    }
    const { header, payload, signingInput, signature } = this.decode(idToken);
    if (header.alg !== 'RS256' || !header.kid) {
      throw new UnauthorizedException('Invalid Firebase token');
    }

    const certificate = await this.getFirebaseCertificate(header.kid);
    this.verifySignature(certificate, signingInput, signature);
    this.assertCommonClaims(payload, {
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
      provider: 'Firebase',
    });
    if (payload.firebase?.sign_in_provider !== 'google.com') {
      throw new UnauthorizedException('Firebase token is not a Google login');
    }
    const providerUserId = payload.user_id ?? payload.sub;
    if (!providerUserId || !payload.email) {
      throw new UnauthorizedException('Firebase token is missing user data');
    }

    return {
      email: payload.email.trim().toLowerCase(),
      fullName: payload.name?.trim() || payload.email,
      metadata: this.providerMetadata(payload),
      providerUserId,
    };
  }

  async verifyTelegramIdToken(idToken: string): Promise<VerifiedTelegramUser> {
    const clientId = this.config.get<string>('socialAuth.telegramClientId');
    const issuer = this.config.get<string>('socialAuth.telegramIssuer');
    if (!clientId || !issuer) {
      throw new ServiceUnavailableException('Telegram login is not configured');
    }
    const { header, payload, signingInput, signature } = this.decode(idToken);
    if (header.alg !== 'RS256' || !header.kid) {
      throw new UnauthorizedException('Invalid Telegram token');
    }

    const key = await this.getTelegramKey(header.kid);
    this.verifySignature(key, signingInput, signature);
    this.assertCommonClaims(payload, {
      audience: clientId,
      issuer,
      provider: 'Telegram',
    });
    if (!payload.sub) {
      throw new UnauthorizedException('Telegram token is missing user data');
    }

    return {
      email: null,
      fullName:
        payload.name?.trim() ||
        payload.preferred_username?.trim() ||
        `Telegram user ${payload.sub}`,
      metadata: this.providerMetadata(payload),
      phone: payload.phone_number ?? null,
      providerUserId: payload.sub,
      username: payload.preferred_username ?? null,
    };
  }

  private providerMetadata(payload: JwtPayload): Record<string, unknown> {
    return {
      audience: payload.aud,
      email: payload.email,
      emailVerified: payload.email_verified,
      firebaseSignInProvider: payload.firebase?.sign_in_provider,
      issuer: payload.iss,
      name: payload.name,
      phoneNumber: payload.phone_number,
      picture: payload.picture,
      preferredUsername: payload.preferred_username,
      subject: payload.sub,
      userId: payload.user_id,
    };
  }

  private decode(idToken: string) {
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid identity token');
    }

    try {
      return {
        header: JSON.parse(
          Buffer.from(parts[0], 'base64url').toString('utf8'),
        ) as JwtHeader,
        payload: JSON.parse(
          Buffer.from(parts[1], 'base64url').toString('utf8'),
        ) as JwtPayload,
        signingInput: Buffer.from(`${parts[0]}.${parts[1]}`),
        signature: Buffer.from(parts[2], 'base64url'),
      };
    } catch {
      throw new UnauthorizedException('Invalid identity token');
    }
  }

  private verifySignature(
    publicKey: string | ReturnType<typeof createPublicKey>,
    signingInput: Buffer,
    signature: Buffer,
  ) {
    const valid = verify('RSA-SHA256', signingInput, publicKey, signature);
    if (!valid) throw new UnauthorizedException('Invalid identity token');
  }

  private assertCommonClaims(
    payload: JwtPayload,
    options: { audience: string; issuer: string; provider: string },
  ) {
    const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    const now = Math.floor(Date.now() / 1000);
    if (
      payload.iss !== options.issuer ||
      !audience.includes(options.audience) ||
      !payload.exp ||
      payload.exp <= now
    ) {
      throw new UnauthorizedException(`${options.provider} token is invalid`);
    }
  }

  private async getFirebaseCertificate(kid: string) {
    if (this.firebaseCertificatesExpireAt <= Date.now()) {
      const response = await fetch(
        'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
      );
      if (!response.ok) {
        throw new ServiceUnavailableException(
          'Firebase certificates are unavailable',
        );
      }
      this.firebaseCertificates = new Map(
        Object.entries((await response.json()) as Record<string, string>),
      );
      this.firebaseCertificatesExpireAt =
        Date.now() + this.cacheMaxAgeMs(response);
    }

    const certificate = this.firebaseCertificates.get(kid);
    if (!certificate) throw new UnauthorizedException('Invalid Firebase token');
    return certificate;
  }

  private async getTelegramKey(kid: string) {
    if (this.telegramKeysExpireAt <= Date.now()) {
      const response = await fetch(
        'https://oauth.telegram.org/.well-known/jwks.json',
      );
      if (!response.ok) {
        throw new ServiceUnavailableException('Telegram keys are unavailable');
      }
      const body = (await response.json()) as {
        keys?: Array<{ kid?: string }>;
      };
      this.telegramKeys = new Map(
        (body.keys ?? [])
          .filter((key) => key.kid)
          .map((key) => [key.kid as string, key]),
      );
      this.telegramKeysExpireAt = Date.now() + this.cacheMaxAgeMs(response);
    }

    const key = this.telegramKeys.get(kid);
    if (!key) throw new UnauthorizedException('Invalid Telegram token');
    return createPublicKey({ format: 'jwk', key } as never);
  }

  private cacheMaxAgeMs(response: Response) {
    const match = response.headers.get('cache-control')?.match(/max-age=(\d+)/);
    return (match ? Number(match[1]) : 3600) * 1000;
  }
}
