import { Module } from '@nestjs/common';
import { AuthorizationModule } from '#app/modules/authorization/authorization.module';

@Module({
  imports: [AuthorizationModule],
  exports: [AuthorizationModule],
})
export class RolesModule {}
