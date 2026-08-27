import { Injectable, BadRequestException } from '@nestjs/common';
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { RedisService } from '@app/redis';
import { OtpType } from './interfaces/otp-payload.interface';
import { StructuredLogger } from '@app/common';

@Injectable()
export class OtpService {
  private readonly logger = new StructuredLogger(OtpService.name);
  private readonly OTP_TTL = 600; // 10 minutes in seconds
  private readonly MAX_ATTEMPTS = 5;

  constructor(private readonly redisService: RedisService) {}

  /**
   * Cryptographically secure 6-digit code. Math.random() is predictable and
   * must never back a security credential.
   */
  private generateOtp(): string {
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
  }

  /** OTPs are stored only as SHA-256 digests: a Redis read must not leak live codes. */
  private hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex');
  }

  async createOtp(email: string, type: OtpType): Promise<string> {
    const otp = this.generateOtp();
    const key = this.getOtpKey(email, type);

    const client = await this.redisService.getClient();
    if (client) {
      await client.set(
        key,
        JSON.stringify({
          otpHash: this.hashOtp(otp),
          createdAt: Date.now(),
          attempts: 0,
        }),
        'EX',
        this.OTP_TTL,
      );
    }

    return otp;
  }

  async verifyOtp(email: string, otp: string, type: OtpType): Promise<boolean> {
    const key = this.getOtpKey(email, type);
    const client = await this.redisService.getClient();

    if (!client) {
      this.logger.error(
        'authentication_otp_service_unavailable',
        new Error('Redis client unavailable'),
        { purpose: type },
      );
      throw new BadRequestException('Verification service unavailable');
    }

    const data = await client.get(key);

    if (!data) {
      this.logger.warn('authentication_otp_rejected', {
        purpose: type,
        reason: 'EXPIRED_OR_MISSING',
      });
      throw new BadRequestException('OTP expired or not found');
    }

    let parsed: { otpHash: string; createdAt: number; attempts: number };
    try {
      parsed = JSON.parse(data);
    } catch {
      await client.del(key);
      throw new BadRequestException('OTP expired or not found');
    }
    if (
      !parsed ||
      typeof parsed.otpHash !== 'string' ||
      typeof parsed.attempts !== 'number'
    ) {
      await client.del(key);
      throw new BadRequestException('OTP expired or not found');
    }

    if (parsed.attempts >= this.MAX_ATTEMPTS) {
      await client.del(key);
      this.logger.warn('authentication_otp_rejected', {
        purpose: type,
        reason: 'ATTEMPT_LIMIT_REACHED',
        failedAttemptCount: parsed.attempts,
      });
      throw new BadRequestException(
        'Too many failed attempts. Please request a new OTP',
      );
    }

    if (!this.constantTimeEquals(parsed.otpHash, this.hashOtp(otp))) {
      parsed.attempts += 1;
      await client.set(key, JSON.stringify(parsed), 'EX', this.OTP_TTL);
      this.logger.warn('authentication_otp_rejected', {
        purpose: type,
        reason: 'CODE_INVALID',
        failedAttemptCount: parsed.attempts,
      });
      throw new BadRequestException('Invalid OTP');
    }

    // Atomic consume: a concurrent verification of the same code fails.
    const consumed = await (client as any).getdel?.(key);
    if (!consumed) {
      throw new BadRequestException('OTP already used');
    }
    return true;
  }

  async deleteOtp(email: string, type: OtpType): Promise<void> {
    await this.redisService.invalidate(this.getOtpKey(email, type));
  }

  async hasOtp(email: string, type: OtpType): Promise<boolean> {
    const client = await this.redisService.getClient();
    if (!client) return false;
    const data = await client.get(this.getOtpKey(email, type));
    return !!data;
  }

  private constantTimeEquals(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      timingSafeEqual(bufA, bufA);
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  }

  private getOtpKey(email: string, type: OtpType): string {
    return `otp:${type}:${email.toLowerCase()}`;
  }
}
