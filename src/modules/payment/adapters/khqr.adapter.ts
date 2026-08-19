import { BadGatewayException, Injectable } from '@nestjs/common';
import * as khqrSdkModule from 'bakong-khqr';
import {
  EncryptedSecret,
  PaymentSecurityService,
} from '../payment-security.service';

const khqrSdk = khqrSdkModule as unknown as {
  BakongKHQR: new () => {
    generateIndividual(input: unknown): {
      status: { code: number; message: string | null };
      data: unknown;
    };
  };
  IndividualInfo: new (
    accountId: string,
    merchantName: string,
    merchantCity: string,
    optional: Record<string, unknown>,
  ) => unknown;
  khqrData: { currency: { usd: number; khr: number } };
};

export type KhqrConfig = {
  accountId: string;
  merchantName: string;
  merchantCity: string;
  baseUrl: string;
};

@Injectable()
export class KhqrAdapter {
  constructor(private readonly security: PaymentSecurityService) {}

  createQr(input: {
    config: KhqrConfig;
    amount: string;
    currency: string;
    billNumber: string;
  }) {
    const info = new khqrSdk.IndividualInfo(
      input.config.accountId,
      input.config.merchantName,
      input.config.merchantCity,
      {
        currency:
          input.currency === 'USD'
            ? khqrSdk.khqrData.currency.usd
            : khqrSdk.khqrData.currency.khr,
        amount: Number(input.amount),
        billNumber: input.billNumber,
        expirationTimestamp: Date.now() + 15 * 60 * 1000,
      },
    );
    const response = new khqrSdk.BakongKHQR().generateIndividual(info);
    const data = this.record(response.data);
    const qrPayload = this.string(data?.qr);
    const md5 = this.string(data?.md5);
    if (response.status.code !== 0 || !qrPayload || !md5)
      throw new BadGatewayException(
        response.status.message ?? 'KHQR generation failed',
      );
    return {
      type: 'QR' as const,
      qrPayload,
      reference: md5,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
  }

  async checkPayment(input: {
    config: KhqrConfig;
    token: EncryptedSecret;
    md5: string;
  }) {
    const response = await fetch(
      `${input.config.baseUrl}/v1/check_transaction_by_md5`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.security.decrypt(input.token)}`,
        },
        body: JSON.stringify({ md5: input.md5 }),
        signal: AbortSignal.timeout(15_000),
      },
    );
    const json: unknown = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new BadGatewayException('Bakong transaction verification failed');
    return this.record(json) ?? {};
  }
  private record(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  }
  private string(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }
}
