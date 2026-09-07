import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreatePlatformInvoiceDto,
  PlatformBillingCallbackQueryDto,
} from './billing.dto';
import { StartMigrationDto } from './migration.dto';

describe('platform operations DTOs', () => {
  it('accepts valid invoice and callback inputs', async () => {
    const invoice = plainToInstance(CreatePlatformInvoiceDto, {
      organizationId: 'org-a',
      periodStart: '2026-09-01T00:00:00.000Z',
      periodEnd: '2026-10-01T00:00:00.000Z',
    });
    const callback = plainToInstance(PlatformBillingCallbackQueryDto, {
      ref: 'SAAS-REF-1',
      outcome: 'success',
      val_id: 'provider-1',
    });

    expect(await validate(invoice)).toHaveLength(0);
    expect(await validate(callback)).toHaveLength(0);
  });

  it('rejects malformed invoice dates and callback outcomes', async () => {
    const invoice = plainToInstance(CreatePlatformInvoiceDto, {
      organizationId: 'org-a',
      periodStart: 'not-a-date',
      periodEnd: 'also-not-a-date',
    });
    const callback = plainToInstance(PlatformBillingCallbackQueryDto, {
      ref: 'SAAS-REF-1',
      outcome: 'unknown',
    });

    expect((await validate(invoice)).map((error) => error.property)).toEqual(
      expect.arrayContaining(['periodStart', 'periodEnd']),
    );
    expect((await validate(callback)).map((error) => error.property)).toContain(
      'outcome',
    );
  });

  it('transforms and bounds migration concurrency controls', async () => {
    const dto = plainToInstance(StartMigrationDto, {
      canaryOrganizationId: 'org-a',
      concurrencyLimit: '4',
      failureThreshold: '3',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.concurrencyLimit).toBe(4);
    expect(dto.failureThreshold).toBe(3);
  });

  it('rejects unsafe migration concurrency controls', async () => {
    const dto = plainToInstance(StartMigrationDto, {
      concurrencyLimit: 33,
      failureThreshold: 0,
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['concurrencyLimit', 'failureThreshold']),
    );
  });
});
