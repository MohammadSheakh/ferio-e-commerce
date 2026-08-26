const VALID_HOST = /^(?:[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?(?::\d{1,5})?$/i;

export function normalizeForwardedTenantHost(rawHost: string | null): string | null {
  if (!rawHost) return null;
  const host = rawHost.split(",", 1)[0].trim().toLowerCase();
  if (!host || host.length > 259 || !VALID_HOST.test(host)) return null;

  const port = host.match(/:(\d+)$/)?.[1];
  if (port && Number(port) > 65535) return null;
  return host;
}

export function tenantHostHeadersFromRequest(request: Request): Record<string, string> {
  const host = normalizeForwardedTenantHost(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
  );
  return host ? { "x-forwarded-host": host } : {};
}
