import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { OtpService } from '../otp.service';
import { OtpType } from '../interfaces/otp-payload.interface';

describe('OtpService security events', () => {
  it('logs invalid verification attempts without email or OTP data', async () => {
    const otpHash = createHash('sha256').update('123456').digest('hex');
    const client = {
      get: jest
        .fn()
        .mockResolvedValue(
          JSON.stringify({ otpHash, createdAt: Date.now(), attempts: 1 }),
        ),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn(),
      call: jest.fn().mockResolvedValue(
        JSON.stringify({ otpHash, createdAt: Date.now(), attempts: 2 }),
      ),
    };
    const service = new OtpService({
      getClient: jest.fn().mockResolvedValue(client),
    } as never);
    const logger = { warn: jest.fn(), error: jest.fn() };
    (service as unknown as { logger: typeof logger }).logger = logger;

    await expect(
      service.verifyOtp(
        'private-customer@example.com',
        '654321',
        OtpType.VERIFY,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(logger.warn).toHaveBeenCalledWith('authentication_otp_rejected', {
      purpose: OtpType.VERIFY,
      reason: 'CODE_INVALID',
      failedAttemptCount: 2,
    });
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain(
      'private-customer@example.com',
    );
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('654321');
  });
});
