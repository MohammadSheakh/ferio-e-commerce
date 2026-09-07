import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateOrganizationDto,
  FinalizeClosureDto,
  InitiateClosureDto,
  ProvisionOrganizationDto,
  TransitionOrganizationDto,
} from './organization.dto';

describe('organization control-plane DTOs', () => {
  it('accepts a valid organization creation request', async () => {
    const dto = plainToInstance(CreateOrganizationDto, {
      name: 'Ferio Store',
      slug: 'ferio-store',
      ownerEmail: 'owner@example.com',
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects malformed slug and owner email', async () => {
    const dto = plainToInstance(CreateOrganizationDto, {
      name: 'Ferio Store',
      slug: 'Ferio Store',
      ownerEmail: 'not-an-email',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['slug', 'ownerEmail']),
    );
  });

  it('validates lifecycle transition and closure reasons', async () => {
    const transition = plainToInstance(TransitionOrganizationDto, {
      status: 'SUSPENDED',
      reason: 'Payment grace period has expired',
    });
    const closure = plainToInstance(InitiateClosureDto, {
      reason: 'Owner requested account closure',
    });

    expect(await validate(transition)).toHaveLength(0);
    expect(await validate(closure)).toHaveLength(0);
  });

  it('rejects invalid lifecycle status and short idempotency key', async () => {
    const transition = plainToInstance(TransitionOrganizationDto, {
      status: 'UNKNOWN',
      reason: 'Valid transition reason',
    });
    const provision = plainToInstance(ProvisionOrganizationDto, {
      idempotencyKey: 'short',
    });

    expect(
      (await validate(transition)).map((error) => error.property),
    ).toContain('status');
    expect(
      (await validate(provision)).map((error) => error.property),
    ).toContain('idempotencyKey');
  });

  it('accepts explicit closure acknowledgement flags', async () => {
    const dto = plainToInstance(FinalizeClosureDto, {
      retentionAcknowledged: true,
      overrideRetentionPeriod: false,
    });

    expect(await validate(dto)).toHaveLength(0);
  });
});
