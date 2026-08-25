import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Immutable, request-scoped tenant context (ADR-0002). Created exclusively by
 * the tenant resolver from control-plane data; nothing downstream may mutate
 * it or source tenant identity from raw request input.
 */
/** Non-secret + encrypted-credential connection material resolved from the
 * control plane. The plaintext password NEVER exists here — decryption happens
 * inside the connection manager at pool creation. */
export interface TenantDatabaseMaterial {
  readonly id: string;
  readonly host: string;
  readonly port: number;
  readonly databaseName: string;
  readonly username: string;
  readonly credentialCipher: string;
}

export interface TenantContext {
  readonly organizationId: string;
  /** Registry ID of the resolved tenant database — the only key the
   * connection manager accepts. */
  readonly tenantDatabaseId: string;
  /** Connection material captured at resolution time so request-scoped data
   * access needs zero extra control-plane round-trips. */
  readonly database: TenantDatabaseMaterial;
  readonly domainId: string;
  readonly hostname: string;
  readonly subscriptionStatus: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED';
}

const storage = new AsyncLocalStorage<TenantContext>();

export function runWithTenantContext<T>(context: TenantContext, callback: () => T): T {
  return storage.run(Object.freeze({ ...context }), callback);
}

/** Throws when accessed outside a tenant-resolved request — fail loud. */
export function getTenantContext(): TenantContext {
  const context = storage.getStore();
  if (!context) {
    throw new Error(
      'TENANT_CONTEXT_MISSING: tenant-scoped code executed outside a resolved tenant request.',
    );
  }
  return context;
}

export function tryGetTenantContext(): TenantContext | undefined {
  return storage.getStore();
}
