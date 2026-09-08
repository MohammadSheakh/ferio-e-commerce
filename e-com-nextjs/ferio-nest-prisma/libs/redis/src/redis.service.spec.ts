import { RedisService } from './redis.service';

describe('RedisService cache deserialization', () => {
  it('returns validated cached values without fetching', async () => {
    const redis = {
      get: jest.fn().mockResolvedValue('{"count":2}'),
      set: jest.fn(),
    };
    const service = new RedisService(redis as never);
    const fetch = jest.fn().mockResolvedValue({ count: 9 });

    await expect(
      service.getOrSet(
        'counter',
        fetch,
        60,
        (value): { count: number } | undefined => {
          if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return undefined;
          }
          const record = value as Record<string, unknown>;
          return typeof record.count === 'number'
            ? { count: record.count }
            : undefined;
        },
      ),
    ).resolves.toEqual({ count: 2 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('treats malformed cached values as misses and repairs the cache', async () => {
    const redis = {
      get: jest.fn().mockResolvedValue('{"count":"invalid"}'),
      set: jest.fn().mockResolvedValue('OK'),
    };
    const service = new RedisService(redis as never);
    const fetch = jest.fn().mockResolvedValue({ count: 9 });

    await expect(
      service.getOrSet(
        'counter',
        fetch,
        60,
        (value): { count: number } | undefined => {
          if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return undefined;
          }
          const record = value as Record<string, unknown>;
          return typeof record.count === 'number'
            ? { count: record.count }
            : undefined;
        },
      ),
    ).resolves.toEqual({ count: 9 });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(redis.set).toHaveBeenCalledWith(
      'counter',
      JSON.stringify({ count: 9 }),
      'EX',
      60,
    );
  });
});
