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
