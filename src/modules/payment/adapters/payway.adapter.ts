import { BadGatewayException, Injectable } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import {
  EncryptedSecret,
  PaymentSecurityService,
} from '../payment-security.service';

export type PayWayConfig = {
  merchantId: string;
  baseUrl: string;
  paymentOption: string;
  callbackUrl?: string;
  qrImageTemplate: string;
};

export type PayWayQrAction = {
  type: 'QR';
  qrPayload: string;
  qrImage: string;
  deepLink?: string;
};

@Injectable()
export class PayWayAdapter {
  constructor(private readonly security: PaymentSecurityService) {}

  async createQr(input: {
    config: PayWayConfig;
    apiKey: EncryptedSecret;
    paymentReference: string;
    amount: string;
    currency: string;
    customer: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
    };
    items: unknown[];
    returnParams: string;
  }): Promise<PayWayQrAction> {
    const reqTime = this.requestTime();
    const body: Record<string, unknown> = {
      req_time: reqTime,
      merchant_id: input.config.merchantId,
      tran_id: input.paymentReference,
      first_name: input.customer.firstName,
      last_name: input.customer.lastName,
      email: input.customer.email ?? '',
      phone: input.customer.phone ?? '',
      amount: Number(input.amount),
      purchase_type: 'purchase',
      payment_option: input.config.paymentOption,
      items: Buffer.from(JSON.stringify(input.items)).toString('base64'),
      currency: input.currency,
      callback_url: input.config.callbackUrl
        ? Buffer.from(input.config.callbackUrl).toString('base64')
        : undefined,
      return_params: input.returnParams,
      qr_image_template: input.config.qrImageTemplate,
    };
    body.hash = this.hash(
      Object.values(body)
        .filter((value): value is string | number | boolean =>
          ['string', 'number', 'boolean'].includes(typeof value),
        )
        .map(String)
        .join(''),
      input.apiKey,
    );
    const response = await this.post(
      `${input.config.baseUrl}/api/payment-gateway/v1/payments/generate-qr`,
      body,
    );
    const status = this.record(response.status);
    const qrPayload = this.string(response.qrString);
    const qrImage = this.string(response.qrImage);
    if (this.string(status?.code) !== '0' || !qrPayload || !qrImage) {
      throw new BadGatewayException(
        this.string(status?.message) ?? 'PayWay QR creation failed',
      );
    }
    return {
      type: 'QR',
      qrPayload,
      qrImage,
      deepLink: this.string(response.abapay_deeplink),
    };
  }

  async verifyTransaction(input: {
    config: PayWayConfig;
    apiKey: EncryptedSecret;
    transactionId: string;
  }) {
    const reqTime = this.requestTime();
    const body = {
      req_time: reqTime,
      merchant_id: input.config.merchantId,
      tran_id: input.transactionId,
      hash: this.hash(
        reqTime + input.config.merchantId + input.transactionId,
        input.apiKey,
      ),
    };
    return this.post(
      `${input.config.baseUrl}/api/payment-gateway/v1/payments/check-transaction`,
      body,
    );
  }

  private hash(value: string, encryptedKey: EncryptedSecret) {
    return createHmac('sha512', this.security.decrypt(encryptedKey))
      .update(value)
      .digest('base64');
  }
  
  private requestTime() {
    return new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, '')
      .slice(0, 14);
  }
  
  private async post(
    url: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new BadGatewayException('PayWay is unavailable');
    }
    const json: unknown = await response.json().catch(() => ({}));
    const result = this.record(json) ?? {};
    if (!response.ok)
      throw new BadGatewayException(
        this.string(result.message) ?? 'PayWay request failed',
      );
    return result;
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
