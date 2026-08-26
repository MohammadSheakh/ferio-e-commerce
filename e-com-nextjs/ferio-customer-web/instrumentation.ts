/**
 * Next.js server instrumentation (node runtime only).
 * Registers the host-forwarding provider so shared BFF fetch helpers can
 * attach the original storefront host (`x-forwarded-host`) to backend calls
 * without importing `next/headers` in client-safe modules.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { normalizeForwardedTenantHost, setHostHeaderProvider } =
      await import("./lib/host-forward");
    const { headers } = await import("next/headers");
    setHostHeaderProvider(async (): Promise<Record<string, string>> => {
      const headerList = headers();
      const host = normalizeForwardedTenantHost(
        headerList.get("x-forwarded-host") ?? headerList.get("host"),
      );
      if (!host) return {};
      return { "x-forwarded-host": host };
    });
  }
}
