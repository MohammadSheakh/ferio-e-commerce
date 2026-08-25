import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../authentication/auth.module';
import {
  AdminStaffAccessController,
  PublicStaffAccessController,
} from './staff-access.controller';
import { StaffAccessService } from './staff-access.service';
import { TenancyModule } from '../../tenancy/tenancy.module';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule, TenancyModule],
  controllers: [PublicStaffAccessController, AdminStaffAccessController],
  providers: [StaffAccessService],
})
export class StaffAccessModule {}
