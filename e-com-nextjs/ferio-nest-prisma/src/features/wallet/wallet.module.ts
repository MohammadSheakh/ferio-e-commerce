import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { AuthModule } from '../authentication/auth.module';
import { AuditModule } from '../audit/audit.module';
import { CustomerNotificationsModule } from '../customer-notifications/customer-notifications.module';
import { AdminWalletController, CustomerWalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule, CustomerNotificationsModule],
  controllers: [CustomerWalletController, AdminWalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
