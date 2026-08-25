import { ForbiddenException } from '@nestjs/common';
import {
  runWithTenantContext,
  type TenantContext,
} from '../tenancy/tenant-context';
import { assertTenantCommerceWritable } from '../tenancy/commerce-write-guard.util';

function suspendedContext(): TenantContext {
  return Object.freeze({
    organizationId: 'org-1',
    tenantDatabaseId: 'tdb-1',
    database: Object.freeze({
      id: 'tdb-1',
      host: 'h',
      port: 5432,
      databaseName: 'd',
      username: 'u',
      credentialCipher: 'c',
    }),
    domainId: 'dom-1',
    hostname: 'suspended.example.com',
    subscriptionStatus: 'SUSPENDED' as const,
  });
}

describe('assertTenantCommerceWritable (PO-005-R)', () => {
  it('denies commerce mutations for SUSPENDED tenants with a stable code', () => {
    expect(() =>
      runWithTenantContext(suspendedContext(), () =>
        assertTenantCommerceWritable(),
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows mutations for ACTIVE tenants', () => {
    expect(() =>
      runWithTenantContext(
        { ...suspendedContext(), subscriptionStatus: 'ACTIVE' },
        assertTenantCommerceWritable,
      ),
    ).not.toThrow();
  });

  it('is a no-op outside tenant contexts (legacy deployments unaffected)', () => {
    expect(() => assertTenantCommerceWritable()).not.toThrow();
  });
});
