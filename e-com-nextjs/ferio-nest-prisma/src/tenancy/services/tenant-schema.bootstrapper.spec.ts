jest.mock('pg', () => ({
  Pool: jest.fn(),
}));

import { Pool } from 'pg';
import { TenantSchemaBootstrapper } from './tenant-schema.bootstrapper';

describe('TenantSchemaBootstrapper baseline seed', () => {
  const poolQuery = jest.fn().mockResolvedValue({ rows: [] });
  const poolEnd = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    poolQuery.mockResolvedValue({ rows: [] });
    (Pool as unknown as jest.Mock).mockImplementation(() => ({
      query: poolQuery,
      end: poolEnd,
    }));
  });

  it('seeds only business-neutral tenant defaults without fake commerce data', async () => {
    const bootstrapper = new TenantSchemaBootstrapper();

    await bootstrapper.seedBaseline({
      host: 'localhost',
      port: 5432,
      database: 'tenant_acme',
      user: 'tenant_acme',
      password: 'secret',
      organizationName: 'Acme Store',
    });

    expect(poolQuery).toHaveBeenCalledTimes(2);
    const statements = poolQuery.mock.calls.map(([sql]) => String(sql));
    expect(statements[0]).toContain('"CommerceSettings"');
    expect(statements[1]).toContain('"CodVerificationPolicy"');
    expect(statements.join('\n')).not.toMatch(
      /INSERT INTO .*"(Customer|Order|PaymentTransaction)"/s,
    );
    const calls = poolQuery.mock.calls as unknown[][];
    expect(calls[0]?.[1]).toEqual(['default', 'Acme Store', 'Ferio']);
    expect(calls[1]?.[1]).toEqual(['default', 'ALWAYS']);
    expect(poolEnd).toHaveBeenCalledTimes(1);
  });
});
