import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { AuthModule } from '../authentication/auth.module';
import { CustomerAccountController } from './customer-account.controller';
import { CustomerAccountService } from './customer-account.service';

@Module({
  imports: [PrismaModule, AuthModule, TenancyModule],
  controllers: [CustomerAccountController],
  providers: [CustomerAccountService],
})
export class CustomerAccountModule {}
