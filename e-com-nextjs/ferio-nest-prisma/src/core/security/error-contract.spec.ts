import { BadRequestException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter, resolveErrorCode } from '@app/common';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

describe('machine-readable error contract', () => {
  it('maps standard statuses and preserves safe domain codes', () => {
    expect(resolveErrorCode(HttpStatus.UNAUTHORIZED)).toBe(
      'AUTHENTICATION_REQUIRED',
    );
    expect(resolveErrorCode(HttpStatus.BAD_REQUEST, undefined, true)).toBe(
      'VALIDATION_ERROR',
    );
    expect(resolveErrorCode(HttpStatus.CONFLICT, 'ORDER_STATE_CONFLICT')).toBe(
      'ORDER_STATE_CONFLICT',
    );
    expect(resolveErrorCode(HttpStatus.BAD_REQUEST, 'unsafe-code')).toBe(
      'BAD_REQUEST',
    );
  });

  it('returns a stable code and correlation reference for validation errors', () => {
    const json = jest.fn<(payload: unknown) => void>();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({
          method: 'POST',
          url: '/api/v1/orders?token=private',
          user: { userId: 'user-1' },
        }),
      }),
    };

    new HttpExceptionFilter().catch(
      new BadRequestException(['name must not be empty']),
      host as never,
    );

    expect(status).toHaveBeenCalledWith(400);
    const calls = json.mock.calls as unknown as Array<[unknown]>;
    const payload = calls.at(-1)?.[0];
    expect(isRecord(payload)).toBe(true);
    if (!isRecord(payload)) return;
    expect(payload.success).toBe(false);
    expect(payload.code).toBe('VALIDATION_ERROR');
    expect(typeof payload.correlationId).toBe('string');
    expect(payload.path).toBe('/api/v1/orders?token=%5BREDACTED%5D');
  });
});
