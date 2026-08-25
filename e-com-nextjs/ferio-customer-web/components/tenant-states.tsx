import Link from "next/link";
import type { TenantStateCode } from "@/lib/tenancy";

interface TenantStateProps {
  storeName?: string;
}

function StateShell({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: "420px", width: "100%", textAlign: "center" }}>
        <p
          style={{
            fontSize: "11px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#6e6e73",
            margin: 0,
          }}
        >
          Ferio Storefront
        </p>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "#111114",
            marginTop: "12px",
            marginBottom: "8px",
          }}
        >
          {title}
        </h1>
        <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#6e6e73", margin: 0 }}>
          {description}
        </p>
        <div
          style={{
            borderTop: "1px solid #e8e8ea",
            marginTop: "28px",
            paddingTop: "24px",
          }}
        >
          {action ? (
            <Link
              href={action.href}
              style={{
                display: "inline-block",
                backgroundColor: "#111114",
                color: "#ffffff",
                borderRadius: "9999px",
                padding: "10px 22px",
                fontSize: "14px",
                textDecoration: "none",
              }}
            >
              {action.label}
            </Link>
          ) : (
            <span style={{ fontSize: "13px", color: "#6e6e73" }}>
              This page will update automatically — no action needed.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** No TenantDomain resolves for this host. */
export function UnknownStoreState({}: TenantStateProps) {
  return (
    <StateShell
      title="No store exists at this address."
      description="Check the web address for typos, or contact the business that shared this link with you."
    />
  );
}

/** Organization suspended / closure pending. */
export function StoreSuspendedState({ storeName }: TenantStateProps) {
  return (
    <StateShell
      title={`${storeName ?? "This store"} is currently unavailable.`}
      description="The store has been temporarily closed by its owner. Existing orders are not affected."
    />
  );
}

/** Provisioning, unhealthy database, or migration in progress. */
export function StoreUnavailableState({ storeName }: TenantStateProps) {
  return (
    <StateShell
      title={`${storeName ?? "This store"} will be back shortly.`}
      description={
        storeName
          ? `${storeName} is undergoing scheduled maintenance. Please try again in a few minutes.`
          : "This store is undergoing maintenance. Please try again in a few minutes."
      }
    />
  );
}

export function tenantStateForCode(
  code: TenantStateCode,
  storeName?: string,
): React.ReactNode | null {
  switch (code) {
    case "TENANT_RESOLUTION_FAILED":
      return <UnknownStoreState />;
    case "TENANT_SUSPENDED":
      return <StoreSuspendedState storeName={storeName} />;
    case "TENANT_UNAVAILABLE":
    case "TENANT_MIGRATION_REQUIRED":
      return <StoreUnavailableState storeName={storeName} />;
    default:
      return null; // LEGACY / ACTIVE render the storefront.
  }
}
