import { Controller, Get } from '@nestjs/common';
import { AppService } from '#app/app.service';
import { Public } from '#app/modules/authenticated/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  getHello(): string {
    return this.appService.getHello();
  }
}
