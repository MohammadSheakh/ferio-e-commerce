"use client";

import { useEffect, useState } from "react";
import { readJsonRecord, responseMessage } from "@/lib/client-response";

interface StorefrontProvisionCardProps {
  organizationId: string;
}

interface StorefrontStatus {
  status: string;
  hasSignatureTemplate: boolean;
  sectionsCount: number;
  versionNumber: number;
}

export function StorefrontProvisionCard({
  organizationId,
}: StorefrontProvisionCardProps) {
  const [storefrontStatus, setStorefrontStatus] = useState<StorefrontStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch(
          `/api/platform/organizations/${organizationId}/storefront/status`,
        );
        const data = await res.json();
        if (res.ok) {
          setStorefrontStatus(data);
        }
      } catch {
        // Non-blocking
      } finally {
        setLoading(false);
      }
    }
    loadStatus();
  }, [organizationId]);

  async function handleProvision() {
    if (
      !window.confirm(
        "Provision the full Signature Initial Showroom Template to this store? This will inject the 3-card interactive hero showcase with hotspots, category grid, product collections, and banners into their storefront. The store will also be able to add more sections or customize with that.",
      )
    ) {
      return;
    }

    setProvisioning(true);
    setFeedback(null);

    try {
      const response = await fetch(
        `/api/platform/organizations/${organizationId}/storefront/provision-signature-template`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      const payload = await readJsonRecord(response);

      if (response.ok) {
        setFeedback({
          type: "success",
          text:
            responseMessage(
              payload,
              "Signature Initial Storefront Template provisioned successfully!",
            ) || "Signature Initial Storefront Template provisioned successfully!",
        });
        setStorefrontStatus({
          status: "READY",
          hasSignatureTemplate: true,
          sectionsCount: typeof payload.sectionsCount === "number" ? payload.sectionsCount : 9,
          versionNumber: typeof payload.versionNumber === "number" ? payload.versionNumber : 1,
        });
      } else {
        setFeedback({
          type: "error",
          text: responseMessage(payload, "Failed to provision storefront template."),
        });
      }
    } catch {
      setFeedback({
        type: "error",
        text: "Platform control plane unavailable.",
      });
    } finally {
      setProvisioning(false);
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Storefront Template Provisioning</p>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: "4px 0 0" }}>
            Design Architecture &amp; Showroom Preset
          </h2>
        </div>
        {!loading && storefrontStatus && (
          <span
            className="statuspill"
            style={{
              backgroundColor: storefrontStatus.hasSignatureTemplate
                ? "rgba(16, 185, 129, 0.12)"
                : "rgba(110, 110, 115, 0.12)",
              color: storefrontStatus.hasSignatureTemplate ? "#059669" : "#6e6e73",
              border: storefrontStatus.hasSignatureTemplate
                ? "1px solid rgba(16, 185, 129, 0.25)"
                : "1px solid rgba(110, 110, 115, 0.25)",
            }}
          >
            {storefrontStatus.hasSignatureTemplate
              ? `Signature Showroom Active (${storefrontStatus.sectionsCount} sections)`
              : storefrontStatus.sectionsCount === 0
                ? "Empty Canvas (Default)"
                : `Custom Storefront (${storefrontStatus.sectionsCount} sections)`}
          </span>
        )}
      </div>

      <p className="muted" style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>
        All normal stores default to an empty canvas upon creation. As a platform administrator,
        you can provision the full <strong>Signature Initial Showroom Template</strong> (interactive
        3-card lifestyle hero with hotspot pins, category grid, product collections, and feedback banners)
        to this specific store. Once granted, the merchant can customize it and add more sections.
      </p>

      {feedback && (
        <div
          style={{
            marginTop: 12,
            padding: "8px 12px",
            borderRadius: 6,
            fontSize: 13,
            backgroundColor:
              feedback.type === "success"
                ? "rgba(16, 185, 129, 0.1)"
                : "rgba(225, 29, 72, 0.1)",
            color: feedback.type === "success" ? "#059669" : "#e11d48",
            border:
              feedback.type === "success"
                ? "1px solid rgba(16, 185, 129, 0.3)"
                : "1px solid rgba(225, 29, 72, 0.3)",
          }}
        >
          {feedback.text}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <button
          type="button"
          onClick={handleProvision}
          disabled={provisioning}
          className="button primary"
          style={{ fontSize: 13, padding: "8px 16px" }}
        >
          {provisioning
            ? "Provisioning Template..."
            : storefrontStatus?.hasSignatureTemplate
              ? "Re-provision Signature Initial Template"
              : "Provision Signature Initial Template"}
        </button>
      </div>
    </div>
  );
}
