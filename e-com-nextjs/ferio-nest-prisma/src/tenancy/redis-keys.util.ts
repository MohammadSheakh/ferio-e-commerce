/**
 * MT-8 §11.1 — tenant-scoped Redis key builder.
 *
 * Every tenant-plane cache/coordination key MUST go through this helper.
 * Inside a resolved tenant context keys are namespaced by organization so
 * identical identifiers across tenants can never collide; outside one
 * (legacy deployments) the historical key shape is preserved verbatim.
 */
import { tryGetTenantContext } from './tenant-context';

export function scopedRedisKey(...parts: Array<string | number>): string {
  const context = tryGetTenantContext();
  if (!context) return parts.join(':');
  return `t:${context.organizationId}:${parts.join(':')}`;
}
