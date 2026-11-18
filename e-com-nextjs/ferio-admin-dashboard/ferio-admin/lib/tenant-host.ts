const VALID_HOST = /^(?:[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?(?::\d{1,5})?$/i;

export function normalizeForwardedTenantHost(rawHost: string | null): string | null {
  if (!rawHost) return null;
  const host = rawHost.split(",", 1)[0].trim().toLowerCase();
  if (!host || host.length > 259 || !VALID_HOST.test(host)) return null;

  // Never treat control plane or admin portal hostnames as tenant storefronts
  const hostWithoutPort = host.split(":")[0];
  if (
    hostWithoutPort === "adminf.sheakh.qzz.io" ||
    hostWithoutPort === "platform.sheakh.qzz.io" ||
    hostWithoutPort.startsWith("admin.") ||
    hostWithoutPort.startsWith("adminf.") ||
    hostWithoutPort.startsWith("platform.") ||
    hostWithoutPort === "localhost" ||
    hostWithoutPort === "127.0.0.1"
  ) {
    return null;
  }

  const port = host.match(/:(\d+)$/)?.[1];
  if (port && Number(port) > 65535) return null;
  return host;
}

export function tenantHostHeadersFromRequest(request: Request): Record<string, string> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)ferio_store_slug=([^;]+)/);
  if (match && match[1]) {
    const slug = decodeURIComponent(match[1]).trim().toLowerCase();
    if (slug) {
      const domain = process.env.PLATFORM_PUBLIC_DOMAIN || "sheakh.qzz.io";
      return { "x-forwarded-host": `${slug}.${domain}` };
    }
  }

  const host = normalizeForwardedTenantHost(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
  );
  return host ? { "x-forwarded-host": host } : {};
}
