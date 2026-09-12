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
import { PosDevicesService } from '../devices/devices.service';

type PosEventPayload = {
  merchantId?: string;
  branchId?: string;
  deviceId?: string;
  [key: string]: unknown;
};

/**
 * Realtime channel for the POS app: order/kitchen/payment/sync updates,
 * fed by the same `EventBusService` the outbox relay re-publishes to after
 * a successful RabbitMQ send (see `OutboxRelayWorker`). Kept as its own
 * `/ws/pos` namespace rather than folded into `NotificationGateway`'s
 * `/notifications` — POS needs branch/device room granularity and a
 * higher, noisier event volume than the dashboard notification stream.
 */
@Injectable()
@WebSocketGateway({
  namespace: '/ws/pos',
  cors: {
    origin: process.env.DASHBOARD_FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class PosGateway
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
    private readonly devices: PosDevicesService,
  ) {}

  onModuleInit() {
    const eventTypes = [
      'order.updated',
      'order.kitchen.created',
      'kitchen.updated',
      'payment.confirmed',
      'payment.refunded',
      'sync.completed',
    ];
    this.subscription = merge(
      ...eventTypes.map((type) => this.events.ofType<PosEventPayload>(type)),
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

      const deviceId = this.handshakeDeviceId(client);
      const device = deviceId
        ? await this.devices.requireActiveDevice(payload.merchantId, deviceId)
        : undefined;

      const socketData = client.data as Record<string, unknown>;
      socketData.merchantId = payload.merchantId;
      socketData.userId = payload.sub;

      await client.join(this.merchantRoom(payload.merchantId));
      if (device) {
        await client.join(this.branchRoom(device.branchId));
        await client.join(this.deviceRoom(deviceId as string));
      }
      client.emit('pos.ready', {
        merchantId: payload.merchantId,
        branchId: device?.branchId,
      });
    } catch {
      client.emit('pos.error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  private broadcast(event: AppEvent<PosEventPayload>) {
    if (!this.server) return;
    const { merchantId, branchId, deviceId } = event.payload;
    if (!merchantId) return;

    const message = {
      type: event.type,
      payload: event.payload,
      occurredAt: event.occurredAt,
    };
    const room = deviceId
      ? this.deviceRoom(deviceId)
      : branchId
        ? this.branchRoom(branchId)
        : this.merchantRoom(merchantId);

    this.server.to(room).emit('pos.event', message);
    this.server.to(room).emit(event.type, message);
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

  private handshakeDeviceId(client: Socket): string | undefined {
    const auth = client.handshake.auth as Record<string, unknown> | undefined;
    return typeof auth?.deviceId === 'string' ? auth.deviceId : undefined;
  }

  private merchantRoom(merchantId: string) {
    return `merchant:${merchantId}`;
  }

  private branchRoom(branchId: string) {
    return `branch:${branchId}`;
  }

  private deviceRoom(deviceId: string) {
    return `device:${deviceId}`;
  }
}
