import {
  Inject,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';
import Redis from 'ioredis';
import {
  REDIS_CLIENT,
  REDIS_PUB_CLIENT,
  REDIS_SUB_CLIENT,
} from './redis.constants';

/**
 * Owns the raw ioredis clients created by the Redis providers so Nest
 * application shutdown also closes their reconnecting sockets.
 */
@Injectable()
export class RedisClientsLifecycle implements OnModuleDestroy {
  constructor(
    @Inject(REDIS_CLIENT) private readonly main: Redis | null,
    @Inject(REDIS_PUB_CLIENT) private readonly pub: Redis | null,
    @Inject(REDIS_SUB_CLIENT) private readonly sub: Redis | null,
  ) {}

  onModuleDestroy(): void {
    for (const client of [this.main, this.pub, this.sub]) {
      client?.disconnect();
    }
  }
}
