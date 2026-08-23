import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { AuthModule } from '../authentication/auth.module';
import { CustomerNotificationsController } from './customer-notifications.controller';
import { CustomerNotificationsService } from './customer-notifications.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CustomerNotificationsController],
  providers: [CustomerNotificationsService],
  exports: [CustomerNotificationsService],
})
export class CustomerNotificationsModule {}
