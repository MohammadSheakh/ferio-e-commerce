"use client";

import { FormEvent, useState } from "react";
import {
  readJsonRecord,
  responseMessage,
} from "@/lib/client-response";

const SUBSCRIPTION_STATUSES = [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "SUSPENDED",
  "CANCELLED",
] as const;

export function SubscriptionActions({
  organizationId,
  status,
}: {
  organizationId: string;
  status: string | null;
}) {
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  async function request(
    action: string,
    method: "POST" | "PATCH" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
  ) {
    setWorking(true);
    setMessage("");
    try {
      const response = await fetch(`/api/platform${path}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const payload = await readJsonRecord(response);
      setMessage(
        response.ok ? `${action} OK.` : responseMessage(payload, `${action} failed.`),
      );
      if (response.ok) window.location.reload();
    } catch {
      setMessage(`${action} failed: control plane unavailable.`);
    } finally {
      setWorking(false);
    }
  }

  function startTrial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const planKey = String(form.get("planKey") ?? "").trim();
    const trialDays = Number(form.get("trialDays") ?? 14);
    if (!/^[a-z][a-z0-9_-]{0,63}$/.test(planKey)) {
      setMessage("Plan key must use lowercase letters, digits, hyphens, or underscores.");
      return;
    }
    if (!Number.isInteger(trialDays) || trialDays < 1 || trialDays > 90) {
      setMessage("Trial length must be an integer from 1 to 90 days.");
      return;
    }
    void request(
      "Start trial",
      "POST",
      `/platform/organizations/${organizationId}/subscription/trial`,
      { planKey, trialDays },
    );
  }

  function saveOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const featureKey = String(form.get("featureKey") ?? "").trim();
    const reason = String(form.get("reason") ?? "").trim();
    const expiresAt = String(form.get("expiresAt") ?? "").trim();
    const enabled = form.get("enabled") === "on";
    const rawLimit = String(form.get("limit") ?? "").trim();
    const limit = rawLimit === "" ? null : Number(rawLimit);
    if (!/^[a-z][a-z0-9_-]{0,99}$/.test(featureKey)) {
      setMessage("Feature key must use lowercase letters, digits, hyphens, or underscores.");
      return;
    }
    if (reason.length < 10 || reason.length > 500) {
      setMessage("Override reason must be between 10 and 500 characters.");
      return;
    }
    if (!expiresAt || Number.isNaN(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now()) {
      setMessage("Override expiry must be a future date and time.");
      return;
    }
    if (limit !== null && (!Number.isSafeInteger(limit) || limit < 0)) {
      setMessage("Limit must be a non-negative integer or blank for unlimited.");
      return;
    }
    void request(
      "Save entitlement override",
      "PUT",
      `/platform/organizations/${organizationId}/entitlement-overrides/${encodeURIComponent(featureKey)}`,
      { featureKey, enabled, limit, reason, expiresAt: new Date(expiresAt).toISOString() },
    );
  }

  const canStartTrial = status === null;

  return (
    <div className="card">
      <p className="eyebrow">Subscription controls</p>
      <p className="muted">
        Status: <strong>{status ?? "NO SUBSCRIPTION"}</strong>. These actions are audited control-plane mutations.
      </p>
      {canStartTrial && (
        <form onSubmit={startTrial} className="row" style={{ flexWrap: "wrap", alignItems: "end" }}>
          <label>
            Plan key
            <input name="planKey" required className="input" placeholder="starter" />
          </label>
          <label>
            Trial days
            <input name="trialDays" type="number" min={1} max={90} defaultValue={14} className="input" />
          </label>
          <button className="pill" disabled={working}>Start trial</button>
        </form>
      )}
      {status && (
        <div className="row" style={{ flexWrap: "wrap", alignItems: "end", marginTop: 12 }}>
          <label>
            Transition to
            <select id="subscription-status" className="input" defaultValue={status}>
              {SUBSCRIPTION_STATUSES.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <button
            className="pill"
            disabled={working}
            onClick={() => {
              const next = (document.getElementById("subscription-status") as HTMLSelectElement).value;
              if (next === status) {
                setMessage("Choose a different subscription status.");
                return;
              }
              void request(
                "Transition subscription",
                "PATCH",
                `/platform/organizations/${organizationId}/subscription/status`,
                { status: next, note: "Transitioned via Platform Admin" },
              );
            }}
          >
            Transition status
          </button>
        </div>
      )}
      {status && (
        <form id="entitlement-override-form" onSubmit={saveOverride} style={{ marginTop: 16 }}>
          <p className="eyebrow">Entitlement override</p>
          <div className="grid3">
            <label>
              Feature key
              <input name="featureKey" required className="input" placeholder="advanced_reports" />
            </label>
            <label>
              Limit
              <input name="limit" type="number" min={0} className="input" placeholder="unlimited" />
            </label>
            <label>
              Expires at
              <input name="expiresAt" type="datetime-local" required className="input" />
            </label>
          </div>
          <label style={{ display: "block", marginTop: 10 }}>
            <input name="enabled" type="checkbox" defaultChecked /> Enabled
          </label>
          <label style={{ display: "block", marginTop: 10 }}>
            Reason
            <textarea name="reason" required minLength={10} maxLength={500} className="input" rows={2} />
          </label>
          <button className="pill" disabled={working} style={{ marginTop: 10 }}>
            Save override
          </button>
          <button
            type="button"
            className="pill"
            disabled={working}
            style={{
              marginTop: 10,
              marginLeft: 8,
              background: "#ffffff",
              color: "#111114",
              border: "1px solid #e8e8ea",
            }}
            onClick={() => {
              const form = document.getElementById("entitlement-override-form");
              const featureKey = String(
                new FormData(form as HTMLFormElement).get("featureKey") ?? "",
              ).trim();
              if (!/^[a-z][a-z0-9_-]{0,99}$/.test(featureKey)) {
                setMessage("Enter a valid feature key before revoking its override.");
                return;
              }
              if (!window.confirm(`Revoke the ${featureKey} override?`)) return;
              void request(
                "Revoke entitlement override",
                "DELETE",
                `/platform/organizations/${organizationId}/entitlement-overrides/${encodeURIComponent(featureKey)}`,
              );
            }}
          >
            Revoke override
          </button>
        </form>
      )}
      <button
        className="pill"
        disabled={working}
        style={{ marginTop: 12, background: "#ffffff", color: "#111114", border: "1px solid #e8e8ea" }}
        onClick={() => void request(
          "Invalidate domain cache",
          "POST",
          `/platform/organizations/${organizationId}/domain-cache/invalidate`,
        )}
      >
        Invalidate domain cache
      </button>
      {message && <p className="muted" role="status">{message}</p>}
    </div>
  );
}
