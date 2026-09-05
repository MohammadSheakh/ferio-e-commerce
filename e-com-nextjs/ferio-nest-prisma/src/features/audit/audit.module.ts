import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { AuthModule } from '../authentication/auth.module';
import { AuditController } from './controllers/audit.controller';
import { AuditService } from './services/audit.service';

@Module({
  imports: [ TenancyModule,PrismaModule, AuthModule],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
