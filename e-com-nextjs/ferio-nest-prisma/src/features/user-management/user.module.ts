import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { AuthModule } from '../authentication/auth.module';

import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';

import { UserProfileController } from './userProfile/userProfile.controller';
import { UserProfileService } from './userProfile/userProfile.service';

import { UserDevicesController } from './userDevices/userDevices.controller';
import { UserDevicesService } from './userDevices/userDevices.service';

import { OAuthAccountController } from './oauthAccount/oauthAccount.controller';
import { OAuthAccountService } from './oauthAccount/oauthAccount.service';

import { RedisModule } from '@app/redis';
import { TenancyModule } from '../../tenancy/tenancy.module';

/**
 * User Module
 *
 * Includes:
 * - User (core entity)
 * - UserProfile (extended profile information)
 * - UserDevices (FCM tokens, device tracking)
 * - OAuthAccount (Google/Apple account linking)
 */
@Module({
  imports: [
    // Redis Module (for caching)
    RedisModule,

    // Prisma Module (primary database access for User service)
    PrismaModule,
    TenancyModule,

    // Auth Module (required for AuthGuard / JwtService)
    AuthModule,
  ],
  controllers: [UserController, UserProfileController, UserDevicesController, OAuthAccountController],
  providers: [UserService, UserProfileService, UserDevicesService, OAuthAccountService],
  exports: [UserService, UserProfileService, UserDevicesService, OAuthAccountService],
})
export class UserModule {}
