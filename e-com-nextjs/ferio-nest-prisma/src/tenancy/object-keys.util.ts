/**
 * Tenant-namespaced object storage keys (PO-017).
 *
 * Every stored object MUST live under `tenants/{organizationId}/…` so object
 * storage inherits the same isolation philosophy as PostgreSQL/Redis/
 * WebSockets. Legacy uploads (no tenant context) keep their historical shape.
 */
import { tryGetTenantContext } from './tenant-context';
import { ServiceUnavailableException } from '@nestjs/common';

export function tenantObjectKey(...parts: Array<string>): string {
  const context = tryGetTenantContext();
  if (!context && process.env.TENANCY_ENABLED === 'true') {
    throw new ServiceUnavailableException(
      'TENANT_IDENTITY_CONTEXT_REQUIRED_FOR_OBJECT_STORAGE',
    );
  }
  const orgPrefix = context ? `tenants/${context.organizationId}` : 'legacy';
  return [orgPrefix, ...parts.filter(Boolean)].join('/');
}
