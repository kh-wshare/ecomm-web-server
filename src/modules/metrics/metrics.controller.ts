import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '@modules/authenticated/decorators/public.decorator';
import { MetricsService } from './metrics.service';

@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Public()
  @Get()
  async getMetrics(@Res() response: Response): Promise<void> {
    const metrics = await this.metricsService.getMetrics();
    response.set('Content-Type', this.metricsService.getContentType());
    response.send(metrics);
  }
}
