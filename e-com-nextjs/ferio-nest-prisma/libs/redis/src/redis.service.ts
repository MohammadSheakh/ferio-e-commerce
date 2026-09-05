import { Inject, Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { errorMessage } from '@app/common';

export type CacheValueParser<T> = (value: unknown) => T | undefined;

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis | null,
  ) {}

  /**
   * Get or set a value in cache
   * @param key Cache key
   * @param fetchFn Function to fetch data if not in cache
   * @param ttl TTL in seconds
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number,
    parseCached: CacheValueParser<T>,
  ): Promise<T> {
    if (!this.redisClient) {
      return await fetchFn();
    }

    try {
      const cached = await this.redisClient.get(key);
      if (cached) {
        const parsed: unknown = JSON.parse(cached);
        const value = parseCached(parsed);
        if (value !== undefined) return value;
      }
    } catch (err) {
      this.logger.error(`Redis get error for key ${key}: ${errorMessage(err)}`);
    }

    const data = await fetchFn();

    if (data !== null && data !== undefined) {
      try {
        await this.redisClient.set(key, JSON.stringify(data), 'EX', ttl);
      } catch (err) {
        this.logger.error(
          `Redis set error for key ${key}: ${errorMessage(err)}`,
        );
      }
    }

    return data;
  }

  async invalidate(key: string | string[]): Promise<void> {
    if (!this.redisClient) return;
    try {
      const keys = Array.isArray(key) ? key : [key];
      await this.redisClient.del(...keys);
    } catch (err) {
      this.logger.error(`Redis invalidate error: ${errorMessage(err)}`);
    }
  }

  async getClient(): Promise<Redis | null> {
    return this.redisClient;
  }
}
