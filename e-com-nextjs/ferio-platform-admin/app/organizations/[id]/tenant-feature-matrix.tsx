"use client";

import { FormEvent, useState } from "react";
import { readJsonRecord, responseMessage } from "@/lib/client-response";

export interface FeatureItem {
  featureKey: string;
  displayName: string;
  category: "CORE" | "SELECTIVE" | "EXPANSION";
  description: string;
  enabled: boolean;
  limit?: number | null;
  source: "PLAN" | "OVERRIDE" | "DEFAULT";
  overrideId?: string;
  expiresAt?: string;
  reason?: string;
}

interface TenantFeatureMatrixProps {
  organizationId: string;
  initialFeatures: FeatureItem[];
  subscriptionStatus: string | null;
}

export function TenantFeatureMatrix({
  organizationId,
  initialFeatures,
  subscriptionStatus,
}: TenantFeatureMatrixProps) {
  const [features, setFeatures] = useState<FeatureItem[]>(initialFeatures);
  const [filterCategory, setFilterCategory] = useState<
    "ALL" | "CORE" | "SELECTIVE" | "EXPANSION"
  >("ALL");
  const [modalTarget, setModalTarget] = useState<FeatureItem | null>(null);
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const filteredFeatures =
    filterCategory === "ALL"
      ? features
      : features.filter((f) => f.category === filterCategory);

  const coreCount = features.filter((f) => f.category === "CORE").length;
  const selectiveCount = features.filter((f) => f.category === "SELECTIVE").length;
  const expansionCount = features.filter((f) => f.category === "EXPANSION").length;

  async function handleResetToPlan(feature: FeatureItem) {
    if (
      !window.confirm(
        `Reset "${feature.displayName}" (${feature.featureKey}) to plan default? This revokes the active override.`,
      )
    ) {
      return;
    }

    setWorking(true);
    setFeedback(null);
    try {
      const response = await fetch(
        `/api/platform/organizations/${organizationId}/entitlement-overrides/${encodeURIComponent(
          feature.featureKey,
        )}`,
        { method: "DELETE" },
      );
      const payload = await readJsonRecord(response);
      if (response.ok) {
        setFeedback({
          type: "success",
          text: `Reset "${feature.displayName}" to plan baseline.`,
        });
        window.location.reload();
      } else {
        setFeedback({
          type: "error",
          text: responseMessage(payload, "Failed to revoke override."),
        });
      }
    } catch {
      setFeedback({
        type: "error",
        text: "Control plane unavailable.",
      });
    } finally {
      setWorking(false);
    }
  }

  async function handleSaveOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modalTarget) return;

    setWorking(true);
    setFeedback(null);

    const form = new FormData(event.currentTarget);
    const enabled = form.get("enabled") === "on";
    const rawLimit = String(form.get("limit") ?? "").trim();
    const limit = rawLimit !== "" ? parseInt(rawLimit, 10) : null;
    const reason = String(form.get("reason") ?? "").trim();
    const expiresAtRaw = String(form.get("expiresAt") ?? "").trim();

    if (reason.length < 10) {
      setFeedback({
        type: "error",
        text: "Reason must be at least 10 characters explaining this commercial change.",
      });
      setWorking(false);
      return;
    }

    const expiresAt = expiresAtRaw
      ? new Date(expiresAtRaw).toISOString()
      : new Date(Date.now() + 365 * 86400000).toISOString();

    try {
      const response = await fetch(
        `/api/platform/organizations/${organizationId}/entitlement-overrides/${encodeURIComponent(
          modalTarget.featureKey,
        )}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled,
            limit,
            reason,
            expiresAt,
          }),
        },
      );
      const payload = await readJsonRecord(response);
      if (response.ok) {
        setFeedback({
          type: "success",
          text: `Saved override for "${modalTarget.displayName}" (${enabled ? "Enabled" : "Disabled"}).`,
        });
        setModalTarget(null);
        window.location.reload();
      } else {
        setFeedback({
          type: "error",
          text: responseMessage(payload, "Failed to update override."),
        });
      }
    } catch {
      setFeedback({
        type: "error",
        text: "Control plane unavailable.",
      });
    } finally {
      setWorking(false);
    }
  }

  // Pre-fill default 1-year date for datetime-local picker
  const defaultExpiryDate = new Date(Date.now() + 365 * 86400000)
    .toISOString()
    .slice(0, 16);

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <p className="eyebrow">Commerce Capabilities & Add-Ons</p>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              margin: "4px 0 2px",
              color: "var(--ink)",
            }}
          >
            Tenant Feature Entitlements
          </h2>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Toggle features on/off for this specific merchant. Overrides take
            precedence over the subscription plan.
          </p>
        </div>

        {subscriptionStatus && (
          <div style={{ display: "flex", gap: 6 }}>
            {(
              [
                { id: "ALL", label: `All (${features.length})` },
                { id: "SELECTIVE", label: `Selective Add-ons (${selectiveCount})` },
                { id: "CORE", label: `Core (${coreCount})` },
                { id: "EXPANSION", label: `Expansion (${expansionCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterCategory(tab.id)}
                className="secondary-button"
                style={{
                  background:
                    filterCategory === tab.id ? "var(--ink)" : "var(--paper)",
                  color:
                    filterCategory === tab.id ? "#ffffff" : "var(--ink)",
                  borderColor:
                    filterCategory === tab.id ? "var(--ink)" : "var(--line)",
                  fontWeight: filterCategory === tab.id ? 600 : 400,
                  fontSize: 12,
                  padding: "5px 12px",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {feedback && (
        <div
          role="status"
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
            background:
              feedback.type === "success" ? "#edf8f1" : "#fef2f2",
            color: feedback.type === "success" ? "#287445" : "#991b1b",
            border: `1px solid ${
              feedback.type === "success" ? "#bbf7d0" : "#fecaca"
            }`,
          }}
        >
          {feedback.text}
        </div>
      )}

      {!subscriptionStatus ? (
        <p className="muted">
          No subscription found. Activate or start a trial to manage feature
          entitlements.
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th style={{ width: "38%" }}>Feature</th>
              <th style={{ width: "16%" }}>Status</th>
              <th style={{ width: "22%" }}>Entitlement Source</th>
              <th style={{ width: "24%", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredFeatures.map((item) => (
              <tr key={item.featureKey}>
                <td>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <strong style={{ fontSize: 13, color: "var(--ink)" }}>
                        {item.displayName}
                      </strong>
                      <span
                        style={{
                          fontSize: 10,
                          padding: "1px 6px",
                          borderRadius: 4,
                          background:
                            item.category === "CORE"
                              ? "#f4f4f5"
                              : item.category === "SELECTIVE"
                              ? "#eff6ff"
                              : "#faf5ff",
                          color:
                            item.category === "CORE"
                              ? "#52525b"
                              : item.category === "SELECTIVE"
                              ? "#1e40af"
                              : "#6b21a8",
                          fontWeight: 500,
                        }}
                      >
                        {item.category}
                      </span>
                    </div>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        color: "var(--ink2)",
                      }}
                    >
                      {item.featureKey}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--ink2)" }}>
                      {item.description}
                    </span>
                  </div>
                </td>
                <td>
                  <span
                    className={`statuspill ${
                      item.enabled ? "status-active" : ""
                    }`}
                  >
                    {item.enabled ? "ENABLED" : "DISABLED"}
                  </span>
                  {item.limit !== null && item.limit !== undefined && (
                    <span
                      style={{
                        display: "block",
                        fontSize: 11,
                        color: "var(--ink2)",
                        marginTop: 2,
                      }}
                    >
                      Limit: {item.limit.toLocaleString()}
                    </span>
                  )}
                </td>
                <td>
                  {item.source === "OVERRIDE" ? (
                    <div>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 9999,
                          fontSize: 11,
                          fontWeight: 500,
                          background: "#fef3c7",
                          color: "#92400e",
                          border: "1px solid #fde68a",
                        }}
                      >
                        Override Active
                      </span>
                      {item.expiresAt && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--ink2)",
                            marginTop: 3,
                          }}
                        >
                          Expires:{" "}
                          {new Date(item.expiresAt).toLocaleDateString()}
                        </div>
                      )}
                      {item.reason && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--ink2)",
                            fontStyle: "italic",
                            maxWidth: 220,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={item.reason}
                        >
                          &ldquo;{item.reason}&rdquo;
                        </div>
                      )}
                    </div>
                  ) : item.source === "PLAN" ? (
                    <span style={{ color: "var(--ink2)", fontSize: 12 }}>
                      Plan Default
                    </span>
                  ) : (
                    <span style={{ color: "var(--ink2)", fontSize: 12 }}>
                      System Default
                    </span>
                  )}
                </td>
                <td style={{ textAlign: "right" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 6,
                    }}
                  >
                    <button
                      type="button"
                      disabled={working}
                      onClick={() => setModalTarget(item)}
                      className="secondary-button"
                      style={{
                        padding: "4px 10px",
                        fontSize: 12,
                        background: item.enabled
                          ? "var(--paper)"
                          : "var(--ink)",
                        color: item.enabled ? "var(--ink)" : "#ffffff",
                        borderColor: item.enabled
                          ? "var(--line)"
                          : "var(--ink)",
                      }}
                    >
                      {item.source === "OVERRIDE"
                        ? "Edit Override"
                        : item.enabled
                        ? "Override (Disable)"
                        : "Override (Enable)"}
                    </button>

                    {item.source === "OVERRIDE" && (
                      <button
                        type="button"
                        disabled={working}
                        onClick={() => void handleResetToPlan(item)}
                        className="secondary-button"
                        style={{
                          padding: "4px 10px",
                          fontSize: 12,
                          color: "#991b1b",
                          borderColor: "#fecaca",
                          background: "#fff5f5",
                        }}
                        title="Revert back to the subscription plan baseline"
                      >
                        Reset to Plan
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal / Drawer for setting entitlement override */}
      {modalTarget && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(17, 17, 20, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 20,
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 500,
              width: "100%",
              background: "#ffffff",
              boxShadow: "0 12px 36px rgba(0,0,0,0.12)",
              padding: 24,
              margin: 0,
            }}
          >
            <p className="eyebrow">Set Entitlement Override</p>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 600,
                margin: "4px 0",
                color: "var(--ink)",
              }}
            >
              {modalTarget.displayName}
            </h3>
            <p
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                color: "var(--ink2)",
                margin: "0 0 16px",
              }}
            >
              {modalTarget.featureKey}
            </p>

            <form onSubmit={handleSaveOverride}>
              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    fontSize: 13,
                    color: "var(--ink)",
                  }}
                >
                  <input
                    type="checkbox"
                    name="enabled"
                    defaultChecked={!modalTarget.enabled}
                    style={{ width: 16, height: 16, accentColor: "var(--ink)" }}
                  />
                  <span>
                    Enable <strong>{modalTarget.displayName}</strong> for this
                    merchant
                  </span>
                </label>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label>
                  Optional Usage Limit (leave blank for unlimited / boolean)
                  <input
                    type="number"
                    name="limit"
                    min={0}
                    defaultValue={modalTarget.limit ?? ""}
                    placeholder="e.g. 500"
                    className="input"
                    style={{ marginTop: 4 }}
                  />
                </label>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label>
                  Expiration Date & Time (defaults to 1 year)
                  <input
                    type="datetime-local"
                    name="expiresAt"
                    required
                    defaultValue={
                      modalTarget.expiresAt
                        ? new Date(modalTarget.expiresAt)
                            .toISOString()
                            .slice(0, 16)
                        : defaultExpiryDate
                    }
                    className="input"
                    style={{ marginTop: 4 }}
                  />
                </label>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label>
                  Audit Reason (Mandatory, min 10 characters)
                  <textarea
                    name="reason"
                    required
                    minLength={10}
                    maxLength={500}
                    rows={3}
                    defaultValue={
                      modalTarget.reason ??
                      (modalTarget.enabled
                        ? "Merchant requested disabling feature."
                        : "Merchant approved for pilot commercial add-on.")
                    }
                    placeholder="Explain why this merchant's entitlement is overridden..."
                    className="input"
                    style={{ marginTop: 4, resize: "vertical" }}
                  />
                </label>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  borderTop: "1px solid var(--line)",
                  paddingTop: 16,
                }}
              >
                <button
                  type="button"
                  disabled={working}
                  onClick={() => setModalTarget(null)}
                  className="secondary-button"
                >
                  Cancel
                </button>
                <button type="submit" disabled={working} className="pill">
                  {working ? "Saving..." : "Save Entitlement Override"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

