import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

export type EncryptedSecret = {
  algorithm: 'aes-256-gcm';
  iv: string;
  tag: string;
  data: string;
};

@Injectable()
export class PaymentSecurityService {
  constructor(private readonly config: ConfigService) {}

  encrypt(secret: string): EncryptedSecret {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const data = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    return {
      algorithm: 'aes-256-gcm',
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      data: data.toString('base64'),
    };
  }

  decrypt(secret: EncryptedSecret): string {
    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.key(),
        Buffer.from(secret.iv, 'base64'),
      );
      decipher.setAuthTag(Buffer.from(secret.tag, 'base64'));
      return Buffer.concat([
        decipher.update(Buffer.from(secret.data, 'base64')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new InternalServerErrorException(
        'Payment provider secret cannot be decrypted',
      );
    }
  }

  verifySignature(
    payload: Buffer,
    signature: string,
    encryptedSecret: EncryptedSecret,
  ) {
    const normalized = signature.startsWith('sha256=')
      ? signature.slice(7)
      : signature;
    if (!/^[a-f0-9]{64}$/i.test(normalized)) return false;
    const expected = createHmac('sha256', this.decrypt(encryptedSecret))
      .update(payload)
      .digest();
    const supplied = Buffer.from(normalized, 'hex');
    return (
      supplied.length === expected.length && timingSafeEqual(supplied, expected)
    );
  }

  fingerprint(value: Buffer | string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private key() {
    const source = this.config.get<string>('payment.encryptionKey');
    if (!source || source.length < 32) {
      throw new InternalServerErrorException(
        'Payment encryption key is not configured',
      );
    }
    return createHash('sha256').update(source).digest();
  }
}
