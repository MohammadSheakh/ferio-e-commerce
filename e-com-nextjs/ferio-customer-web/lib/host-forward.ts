/**
 * Host-forwarding provider (MT-5).
 *
 * Shared BFF fetch helpers run in BOTH server and client bundles, so they can
 * never import `next/headers` directly. Instead, the server runtime registers
 * a provider here (see `instrumentation.ts`) that reads the incoming request
 * host; client bundles simply get empty headers.
 *
 * The forwarded host is how the backend resolves which tenant a proxied
 * storefront request belongs to.
 */

type HostHeaderProvider = () => Promise<Record<string, string>>;

let provider: HostHeaderProvider | null = null;

const VALID_HOST = /^(?:[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?(?::\d{1,5})?$/i;

function trustsForwardedHost(): boolean {
  return process.env.CUSTOMER_WEB_TRUSTED_PROXY === 'true';
}

export function normalizeForwardedTenantHost(rawHost: string | null): string | null {
  if (!rawHost) return null;
  const values = rawHost.split(",").map((value) => value.trim()).filter(Boolean);
  if (values.length !== 1) return null;
  const host = values[0].toLowerCase();
  if (!host || host.length > 259 || !VALID_HOST.test(host)) return null;

  const port = host.match(/:(\d+)$/)?.[1];
  if (port && Number(port) > 65535) return null;
  return host;
}

export function tenantHostFromHeaders(
  headers: Pick<Headers, 'get'>,
): string | null {
  const rawHost = trustsForwardedHost()
    ? headers.get('x-forwarded-host') ?? headers.get('host')
    : headers.get('host');
  return normalizeForwardedTenantHost(rawHost);
}

export function hostForwardHeadersFromRequest(request: Request): Record<string, string> {
  const host = tenantHostFromHeaders(request.headers);
  return host ? { "x-forwarded-host": host } : {};
}

/** Server bootstrap only (called from instrumentation.ts). */
export function setHostHeaderProvider(fn: HostHeaderProvider): void {
  provider = fn;
}

/** Safe in every bundle: returns {} on the client or before registration. */
export async function hostForwardHeaders(): Promise<Record<string, string>> {
  if (!provider) return {};
  try {
    return await provider();
  } catch {
    return {};
  }
}
