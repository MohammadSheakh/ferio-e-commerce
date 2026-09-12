import Redis from 'ioredis';
import { RedisClientsLifecycle } from '../../../../libs/redis/src/redis.lifecycle';

describe('RedisClientsLifecycle', () => {
  it('disconnects every configured client during module shutdown', () => {
    const disconnects = [jest.fn(), jest.fn(), jest.fn()];
    const clients = disconnects.map((disconnect) => ({
      disconnect,
    })) as unknown as Redis[];

    const lifecycle = new RedisClientsLifecycle(
      clients[0],
      clients[1],
      clients[2],
    );

    lifecycle.onModuleDestroy();

    for (const disconnect of disconnects) {
      expect(disconnect).toHaveBeenCalledTimes(1);
    }
  });

  it('ignores optional clients that failed to initialize', () => {
    const disconnect = jest.fn();
    const client = { disconnect } as unknown as Redis;
    const lifecycle = new RedisClientsLifecycle(client, null, null);

    expect(() => lifecycle.onModuleDestroy()).not.toThrow();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
