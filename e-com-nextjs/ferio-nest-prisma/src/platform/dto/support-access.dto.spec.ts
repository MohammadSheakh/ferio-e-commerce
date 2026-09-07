import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateSupportAccessDto,
  ListSupportAccessQueryDto,
} from './support-access.dto';

describe('support-access DTOs', () => {
  it('accepts a bounded support grant request and transforms ttlMinutes', async () => {
    const dto = plainToInstance(CreateSupportAccessDto, {
      organizationId: 'org-a',
      reason: 'Investigate a customer checkout issue',
      ttlMinutes: '30',
      scope: { readOnly: true },
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.ttlMinutes).toBe(30);
  });

  it('rejects short reasons and out-of-range TTL values', async () => {
    const dto = plainToInstance(CreateSupportAccessDto, {
      organizationId: 'org-a',
      reason: 'too short',
      ttlMinutes: 481,
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['reason', 'ttlMinutes']),
    );
  });

  it('rejects non-object support scopes', async () => {
    const dto = plainToInstance(CreateSupportAccessDto, {
      organizationId: 'org-a',
      reason: 'Investigate a customer checkout issue',
      scope: 'read-only',
    });

    expect((await validate(dto)).map((error) => error.property)).toContain(
      'scope',
    );
  });

  it('accepts an omitted organization filter for active-grant listing', async () => {
    const dto = plainToInstance(ListSupportAccessQueryDto, {});

    expect(await validate(dto)).toHaveLength(0);
  });
});
