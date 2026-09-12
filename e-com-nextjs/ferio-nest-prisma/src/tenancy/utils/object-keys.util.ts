/**
 * Tenant-namespaced object storage keys (PO-017).
 *
 * Every stored object MUST live under `tenants/{organizationId}/…` so object
 * storage inherits the same isolation philosophy as PostgreSQL/Redis/
 * WebSockets. Legacy uploads (no tenant context) keep their historical shape.
 */
import { tryGetTenantContext } from '../context/tenant-context';
import {
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';

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

/** Validate a client- or persistence-supplied key against ambient tenancy. */
export function assertTenantObjectKey(key: string): void {
  if (
    typeof key !== 'string' ||
    key.length === 0 ||
    key.includes('\\') ||
    key.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    throw new ForbiddenException('STORAGE_KEY_FORBIDDEN');
  }

  const context = tryGetTenantContext();
  if (!context && process.env.TENANCY_ENABLED === 'true') {
    throw new ServiceUnavailableException(
      'TENANT_IDENTITY_CONTEXT_REQUIRED_FOR_OBJECT_STORAGE',
    );
  }
  if (!context) return;

  const required = `tenants/${context.organizationId}/`;
  if (!key.startsWith(required)) {
    throw new ForbiddenException('STORAGE_KEY_FORBIDDEN');
  }
}
