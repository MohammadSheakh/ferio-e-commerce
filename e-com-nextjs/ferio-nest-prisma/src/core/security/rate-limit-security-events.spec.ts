import { HttpException, HttpStatus } from '@nestjs/common';
import { SlidingWindowRateLimitGuard } from '@app/common';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

describe('rate-limit security events', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFailOpen = process.env.RATE_LIMIT_FAIL_OPEN;

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalFailOpen === undefined) delete process.env.RATE_LIMIT_FAIL_OPEN;
    else process.env.RATE_LIMIT_FAIL_OPEN = originalFailOpen;
  });

  it('logs a bounded authentication rejection without client identifiers', async () => {
    const pipeline = {
      zremrangebyscore: jest.fn(),
      zadd: jest.fn(),
      expire: jest.fn(),
      zcard: jest.fn(),
      zrange: jest.fn(),
      exec: jest.fn(),
    };
    for (const method of [
      'zremrangebyscore',
      'zadd',
      'expire',
      'zcard',
      'zrange',
    ] as const) {
      pipeline[method].mockReturnValue(pipeline);
    }
    pipeline.exec.mockResolvedValue([
      [null, 0],
      [null, 1],
      [null, 1],
      [null, 6],
      [null, ['request-id', String(Date.now() - 1_000)]],
    ]);

    const reflector = {
      get: jest.fn().mockReturnValue({
        max: 5,
        windowMs: 15 * 60 * 1_000,
        keyPrefix: 'auth',
      }),
    };
    const guard = new SlidingWindowRateLimitGuard(
      reflector as never,
      { multi: jest.fn().mockReturnValue(pipeline) } as never,
    );
    const logger = {
      warn: jest.fn<(event: string, payload: unknown) => void>(),
      error: jest.fn<(event: string, payload: unknown) => void>(),
    };
    (guard as unknown as { logger: typeof logger }).logger = logger;
    const response = { set: jest.fn() };
    const context = {
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ ip: 'private-client-address' }),
        getResponse: () => response,
      }),
    };

    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(
      HttpException,
    );

    const warningCalls = logger.warn.mock.calls as unknown as Array<
      [string, unknown]
    >;
    const warningCall = warningCalls.at(-1);
    expect(warningCall?.[0]).toBe('authentication_rate_limit_exceeded');
    expect(isRecord(warningCall?.[1])).toBe(true);
    if (!isRecord(warningCall?.[1])) return;
    expect(warningCall[1].keyPrefix).toBe('auth');
    expect(warningCall[1].requestCount).toBe(6);
    expect(warningCall[1].requestLimit).toBe(5);
    expect(warningCall[1].windowMs).toBe(15 * 60 * 1_000);
    expect(typeof warningCall[1].retryAfterSeconds).toBe('number');
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain(
      'private-client-address',
    );
  });

  it('fails closed in production when Redis is unavailable', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.RATE_LIMIT_FAIL_OPEN;

    const reflector = {
      get: jest.fn().mockReturnValue({
        max: 5,
        windowMs: 60_000,
        keyPrefix: 'auth',
      }),
    };
    const guard = new SlidingWindowRateLimitGuard(reflector as never, null);
    const context = {
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ ip: 'private-client-address' }),
        getResponse: () => ({ set: jest.fn() }),
      }),
    };

    await expect(guard.canActivate(context as never)).rejects.toMatchObject({
      status: HttpStatus.SERVICE_UNAVAILABLE,
    });
  });

  it('fails closed in production when a Redis pipeline command fails', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.RATE_LIMIT_FAIL_OPEN;

    const pipeline = {
      zremrangebyscore: jest.fn(),
      zadd: jest.fn(),
      expire: jest.fn(),
      zcard: jest.fn(),
      zrange: jest.fn(),
      exec: jest.fn().mockResolvedValue([
        [new Error('redis command failed'), 0],
        [null, 1],
        [null, 1],
        [null, 1],
        [null, []],
      ]),
    };
    for (const method of [
      'zremrangebyscore',
      'zadd',
      'expire',
      'zcard',
      'zrange',
    ] as const) {
      pipeline[method].mockReturnValue(pipeline);
    }

    const reflector = {
      get: jest.fn().mockReturnValue({
        max: 5,
        windowMs: 60_000,
        keyPrefix: 'auth',
      }),
    };
    const guard = new SlidingWindowRateLimitGuard(
      reflector as never,
      { multi: jest.fn().mockReturnValue(pipeline) } as never,
    );
    const context = {
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ ip: 'private-client-address' }),
        getResponse: () => ({ set: jest.fn() }),
      }),
    };

    await expect(guard.canActivate(context as never)).rejects.toMatchObject({
      status: HttpStatus.SERVICE_UNAVAILABLE,
    });
  });
});
