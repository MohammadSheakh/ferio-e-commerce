import Redis from 'ioredis';

const redisPort = Number(process.env.TEST_REDIS_PORT);
const queuePrefix = process.env.TEST_QUEUE_PREFIX;
if (!Number.isInteger(redisPort) || redisPort < 1 || redisPort === 6379) {
  throw new Error(
    'TEST_REDIS_PORT must use an isolated non-default Redis port',
  );
}
if (!queuePrefix?.startsWith('ferio:test:')) {
  throw new Error('TEST_QUEUE_PREFIX must start with ferio:test:');
}

const keyPrefix = `${queuePrefix}:redis-capacity:${process.pid}`;

function boundedEnv(name: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

describe('Redis capacity and recovery smoke', () => {
  let redis: Redis;

  beforeAll(async () => {
    redis = new Redis({
      host: '127.0.0.1',
      port: redisPort,
      keyPrefix: `${keyPrefix}:`,
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
    });
    await redis.ping();
  });

  afterAll(async () => {
    await redis?.quit().catch(() => redis?.disconnect());
  });

  it('measures isolated pipelined commands and verifies client reconnect recovery', async () => {
    const commandCount = boundedEnv(
      'REDIS_CAPACITY_COMMANDS',
      1_000,
      10,
      20_000,
    );
    const pipeline = redis.pipeline();
    for (let index = 0; index < commandCount; index += 1) {
      pipeline.set(`value:${index}`, String(index), 'EX', 60);
    }

    const started = performance.now();
    const results = await pipeline.exec();
    const elapsedMs = Math.round(performance.now() - started);
    const failures = (results ?? []).filter(([error]) => error !== null).length;

    expect(results).toHaveLength(commandCount);
    expect(failures).toBe(0);

    const sample = await redis.mget('value:0', `value:${commandCount - 1}`);
    expect(sample).toEqual(['0', String(commandCount - 1)]);

    redis.disconnect();
    await redis.connect();
    expect(await redis.ping()).toBe('PONG');
    await redis.set('recovery-check', 'ok', 'EX', 60);
    expect(await redis.get('recovery-check')).toBe('ok');

    console.log(
      JSON.stringify({
        event: 'perf_redis_pipeline',
        commandCount,
        elapsedMs,
        commandsPerSecond: Math.round(
          (commandCount / Math.max(elapsedMs, 1)) * 1000,
        ),
        reconnect: 'ok',
      }),
    );
  }, 60_000);
});
