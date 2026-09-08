import {
  Controller,
  Get,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '@app/database';
import { RedisService } from '@app/redis';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly redis?: RedisService,
  ) {}

  @Get()
  getApplicationInfo() {
    return this.appService.getApplicationInfo();
  }

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('ready')
  async getReadiness() {
    if (!this.prisma || !this.redis) {
      throw new ServiceUnavailableException(
        'READINESS_DEPENDENCIES_UNAVAILABLE',
      );
    }

    const redisClient = await this.redis.getClient();
    if (!redisClient) {
      throw new ServiceUnavailableException('REDIS_UNAVAILABLE');
    }

    try {
      await Promise.all([this.prisma.$queryRaw`SELECT 1`, redisClient.ping()]);
    } catch {
      throw new ServiceUnavailableException('READINESS_CHECK_FAILED');
    }

    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }
}
