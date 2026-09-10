import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleDestroy {
  readonly registry = new Registry();

  constructor() {
    collectDefaultMetrics({ register: this.registry });
  }

  getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }

  onModuleDestroy() {
    this.registry.clear();
  }
}
