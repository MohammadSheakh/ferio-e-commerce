/**
 * Decoupled hook letting the control plane invalidate tenancy's cached
 * domain→organization mappings when domains change (MT-2 §5.1 explicit
 * invalidation). A setter keeps `platform` free of any import from
 * `tenancy`, preserving the one-way dependency direction.
 */
type DomainCacheInvalidator = (hostname: string) => Promise<void> | void;

let invalidator: DomainCacheInvalidator | null = null;

/** Called once by the tenancy module during bootstrap. */
export function setDomainCacheInvalidator(fn: DomainCacheInvalidator): void {
  invalidator = fn;
}

/** Fire-and-forget: TTL bounds staleness even if invalidation fails. */
export function invalidateDomainCache(hostname: string): void {
  if (!invalidator) return;
  try {
    void Promise.resolve(invalidator(hostname)).catch(() => undefined);
  } catch {
    // Never let cache bookkeeping break a control-plane operation.
  }
}
