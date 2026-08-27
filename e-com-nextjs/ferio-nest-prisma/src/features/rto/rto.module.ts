import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { AuthModule } from '../authentication/auth.module';
import { AuditModule } from '../audit/audit.module';
import { RtoController } from './rto.controller';
import { RtoService } from './rto.service';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule],
  controllers: [RtoController],
  providers: [RtoService],
})
export class RtoModule {}
