import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { AuthModule } from '../authentication/auth.module';
import { AuditModule } from '../audit/audit.module';
import { RtoController } from './rto.controller';
import { RtoService } from './rto.service';

@Module({
  imports: [ TenancyModule,PrismaModule, AuthModule, AuditModule],
  controllers: [RtoController],
  providers: [RtoService],
})
export class RtoModule {}
