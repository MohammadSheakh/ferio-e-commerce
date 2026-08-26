import { HttpException, HttpStatus } from '@nestjs/common';

/** Stable machine codes for every tenant-plane failure mode (MT-0 §3.3). */
export type TenantErrorCode =
  | 'TENANT_HOST_INVALID'
  | 'TENANT_FORWARDED_HOST_UNTRUSTED'
  | 'TENANT_RESOLUTION_FAILED'
  | 'TENANT_UNAVAILABLE'
  | 'TENANT_SUSPENDED'
  | 'TENANT_MIGRATION_REQUIRED'
  | 'TENANT_DATABASE_UNHEALTHY'
  | 'TENANT_CONTEXT_MISSING';

export class TenantResolutionException extends HttpException {
  readonly code: TenantErrorCode;

  constructor(code: TenantErrorCode, httpStatus: HttpStatus = HttpStatus.NOT_FOUND) {
    super(
      // Never leak internal details (hosts checked, registry rows, credentials).
      { statusCode: httpStatus, code, message: TENANT_ERROR_MESSAGES[code] },
      httpStatus,
    );
    this.code = code;
  }
}

const TENANT_ERROR_MESSAGES: Record<TenantErrorCode, string> = {
  TENANT_HOST_INVALID: 'This store address is not valid.',
  TENANT_FORWARDED_HOST_UNTRUSTED: 'This store address was not received from a trusted proxy.',
  TENANT_RESOLUTION_FAILED: 'No store exists at this address.',
  TENANT_UNAVAILABLE: 'This store is temporarily unavailable. Please try again later.',
  TENANT_SUSPENDED: 'This store is currently unavailable.',
  TENANT_MIGRATION_REQUIRED:
    'This store is undergoing maintenance and will be back shortly.',
  TENANT_DATABASE_UNHEALTHY: 'This store is temporarily unavailable. Please try again later.',
  TENANT_CONTEXT_MISSING: 'This request was not routed through a store.',
};

/**
 * Normalize a raw Host header into a canonical hostname.
 * Pure function so the strictest security rules are unit-tested in isolation.
 */
export function normalizeTenantHost(rawHost: string | undefined): string {
  if (!rawHost) throw new TenantResolutionException('TENANT_HOST_INVALID');
  let host = String(rawHost).trim().toLowerCase();
  // Strip port (but never from IPv6 literals, which we reject outright).
  if (!host.startsWith('[')) {
    host = host.replace(/:\d+$/, '');
  }
  if (host.endsWith('.')) host = host.slice(0, -1);

  const valid =
    /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(host) &&
    !host.includes('..') &&
    host.length <= 253 &&
    !/^\d{1,3}(\.\d{1,3}){3}$/.test(host) && // no IP-literal hosts
    !host.startsWith('['); // no IPv6
  if (!valid) throw new TenantResolutionException('TENANT_HOST_INVALID');
  return host;
}
