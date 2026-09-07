import { AuditService } from '../services/audit.service';
import {
  runWithTenantContext,
  type TenantContext,
} from '../../../tenancy/context/tenant-context';
import { runWithCorrelationId } from '@app/common';

function tenantContext(): TenantContext {
  return {
    correlationId: 'tenant-request-123',
    organizationId: 'org-a',
    tenantDatabaseId: 'tenant-db-a',
    database: {
      id: 'tenant-db-a',
      host: 'db.internal',
      port: 5432,
      databaseName: 'tenant_a',
      username: 'tenant_a',
      credentialCipher: 'encrypted',
    },
    domainId: 'domain-a',
    hostname: 'a.ferio.local',
    subscriptionStatus: 'ACTIVE',
  };
}

describe('AuditService tenant evidence', () => {
  afterEach(() => {
    delete process.env.TENANCY_ENABLED;
  });

  it('adds safe tenant and correlation context to every tenant audit row', async () => {
    const calls: Array<[{ data: unknown }]> = [];
    const create = jest.fn((input: { data: unknown }) => {
      calls.push([input]);
      return { id: 'audit-1' };
    });
    const service = new AuditService(
      { auditLog: { create } } as never,
      undefined,
    );

    await runWithCorrelationId('request-correlation-123', () =>
      runWithTenantContext(tenantContext(), () =>
        service.record({
          action: 'PRODUCT_UPDATED',
          entityType: 'Product',
          entityId: 'product-1',
          metadata: { source: 'admin' },
        }),
      ),
    );

    expect(create).toHaveBeenCalledTimes(1);
    const call = calls[0]?.[0] as { data?: { metadata?: unknown } } | undefined;
    expect(call?.data?.metadata).toEqual({
      source: 'admin',
      context: {
        correlationId: 'tenant-request-123',
        organizationId: 'org-a',
        tenantDatabaseId: 'tenant-db-a',
        domainId: 'domain-a',
        hostname: 'a.ferio.local',
      },
    });
  });
});
