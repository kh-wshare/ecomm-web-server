import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { merge, Subscription } from 'rxjs';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import {
  AppEvent,
  EventBusService,
} from '#app/infrastructure/events/event-bus.service';
import type { JwtPayload } from '#app/modules/authenticated/strategies/jwt.strategy';

type MerchantEventPayload = {
  merchantId?: string;
  [key: string]: unknown;
};

@Injectable()
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: process.env.DASHBOARD_FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer()
  private server!: Server;

  private subscription?: Subscription;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly events: EventBusService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const eventTypes = [
      'order.created',
      'payment.confirmed',
      'payment.failed',
      'payment.webhook_failed',
      'inventory.low_stock',
      'inventory.out_of_stock',
      'social.post_published',
    ];
    this.subscription = merge(
      ...eventTypes.map((type) =>
        this.events.ofType<MerchantEventPayload>(type),
      ),
    ).subscribe((event) => this.broadcast(event));
  }

  onModuleDestroy() {
    this.subscription?.unsubscribe();
  }

  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      const token = this.connectionToken(client);
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('jwt.secret'),
      });
      if (!payload.merchantId) throw new Error('Merchant context required');
      const session = await this.prisma.session.findUnique({
        where: { id: payload.sessionId },
        include: { user: true },
      });
      const membership = await this.prisma.merchantUser.findUnique({
        where: {
          merchantId_userId: {
            merchantId: payload.merchantId,
            userId: payload.sub,
          },
        },
        include: { merchant: true },
      });
      if (
        !session ||
        session.userId !== payload.sub ||
        session.merchantId !== payload.merchantId ||
        session.revokedAt ||
        session.expiresAt.getTime() <= Date.now() ||
        session.user.status !== 'ACTIVE' ||
        session.user.deletedAt ||
        !membership ||
        membership.status !== 'ACTIVE' ||
        membership.merchant.status !== 'ACTIVE' ||
        membership.merchant.deletedAt
      ) {
        throw new Error('Session is not active');
      }
      const socketData = client.data as Record<string, unknown>;
      socketData.merchantId = payload.merchantId;
      socketData.userId = payload.sub;
      await client.join(this.room(payload.merchantId));
      client.emit('notifications.ready', {
        merchantId: payload.merchantId,
      });
    } catch {
      client.emit('notifications.error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  private broadcast(event: AppEvent<MerchantEventPayload>) {
    const merchantId = event.payload.merchantId;
    if (!merchantId || !this.server) return;
    const message = {
      type: event.type,
      payload: event.payload,
      occurredAt: event.occurredAt,
    };
    this.server.to(this.room(merchantId)).emit('notification', message);
    this.server.to(this.room(merchantId)).emit(event.type, message);
  }

  private connectionToken(client: Socket): string {
    const auth = client.handshake.auth as Record<string, unknown> | undefined;
    const authToken = auth?.token;
    if (typeof authToken === 'string' && authToken) return authToken;
    const authorization: unknown = client.handshake.headers.authorization;
    const header =
      typeof authorization === 'string'
        ? authorization
        : Array.isArray(authorization) && typeof authorization[0] === 'string'
          ? authorization[0]
          : undefined;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    throw new Error('Missing token');
  }

  private room(merchantId: string) {
    return `merchant:${merchantId}`;
  }
}
