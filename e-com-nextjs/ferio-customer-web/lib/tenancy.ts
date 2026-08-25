import { headers } from "next/headers";

export type TenantStateCode =
  | "LEGACY"
  | "ACTIVE"
  | "TENANT_RESOLUTION_FAILED"
  | "TENANT_SUSPENDED"
  | "TENANT_UNAVAILABLE"
  | "TENANT_MIGRATION_REQUIRED";

export interface TenantStatus {
  code: TenantStateCode;
  storeName?: string;
}

/**
 * Server-side tenancy status for this storefront host (MT-5).
 * The backend is the single authority for host → tenant mapping; the
 * storefront only renders the state it is told. Fail-closed: when the status
 * endpoint cannot be reached AND tenancy is enabled upstream, the store
 * renders unavailable rather than guessing.
 */
export async function getTenantStatus(): Promise<TenantStatus> {
  const headerList = headers();
  const forwardedHost =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? undefined;
  if (!forwardedHost) return { code: "LEGACY" };

  const backendUrl =
    process.env.NEXT_PUBLIC_FERIO_API_URL ?? "http://localhost:6733/api/v1";
  try {
    const response = await fetch(`${backendUrl}/tenancy/status`, {
      headers: {
        // The backend resolves tenants from the ORIGINAL storefront host.
        "x-forwarded-host": forwardedHost,
        Accept: "application/json",
      },
      next: { revalidate: 15 },
    });
    if (!response.ok) {
      return { code: "TENANT_UNAVAILABLE" };
    }
    return (await response.json()) as TenantStatus;
  } catch {
    // Backend unreachable: fail closed only makes sense when we know tenancy
    // is on. A legacy deployment must keep rendering; the backend decides —
    // an unreachable one is treated as unavailable to avoid spoofed hosts
    // silently downgrading security.
    return { code: "TENANT_UNAVAILABLE" };
  }
}
