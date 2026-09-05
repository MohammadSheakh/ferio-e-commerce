"use client";

import { useState } from "react";

type Entitlement = {
  featureKey: string;
  enabled: boolean;
  limit: number | null;
};

export type EditablePlan = {
  id: string;
  key: string;
  displayName: string;
  billingInterval: "MONTHLY" | "YEARLY";
  amountMinor: number;
  isActive: boolean;
  entitlements: Entitlement[];
};

const FEATURE_LABELS: Record<string, string> = {
  staff_seats: "Staff seats",
  products_max: "Products",
  orders_per_month: "Orders per month",
  warehouses_max: "Warehouses",
  storage_gb: "Storage (GB)",
  storefront: "Storefront",
  mobile_customer: "Mobile customer experience",
  inventory: "Inventory",
  online_payments: "Online payments",
  returns_rto: "Returns and RTO",
  basic_reports: "Basic reports",
  advanced_reports: "Advanced reports",
  custom_domain: "Custom domain",
  ferio_subdomain: "Ferio subdomain",
  couriers_basic: "Courier integrations",
  crm: "Customer 360 / CRM",
  campaigns: "Campaigns",
  marketing_advanced: "Advanced marketing",
  priority_support: "Priority support",
  rider_management: "Rider management",
  live_rider_tracking: "Live rider tracking",
  api_webhooks: "API and webhooks",
};

function labelFor(key: string) {
  return FEATURE_LABELS[key] ?? key.replace(/[_-]/g, " ");
}

function formatAmount(amountMinor: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

export function PlanEditor({ plan }: { plan: EditablePlan }) {
  const [displayName, setDisplayName] = useState(plan.displayName);
  const [billingInterval, setBillingInterval] = useState(plan.billingInterval);
  const [amountMinor, setAmountMinor] = useState(String(plan.amountMinor));
  const [isActive, setIsActive] = useState(plan.isActive);
  const [entitlements, setEntitlements] = useState(plan.entitlements);
  const [newFeature, setNewFeature] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function updateEntitlement(index: number, patch: Partial<Entitlement>) {
    setEntitlements((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  function addFeature() {
    const featureKey = newFeature.trim().toLowerCase().replace(/\s+/g, "_");
    if (!featureKey || entitlements.some((item) => item.featureKey === featureKey)) {
      return;
    }
    setEntitlements((current) => [
      ...current,
      { featureKey, enabled: true, limit: null },
    ]);
    setNewFeature("");
  }

  async function save() {
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/platform/plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        billingInterval,
        amountMinor: Number(amountMinor || 0),
        isActive,
        entitlements,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    setMessage(response.ok ? "Saved" : data.message || "Unable to save changes.");
  }

  return (
    <section className="plan-card">
      <div className="plan-card-head">
        <div>
          <p className="eyebrow">Plan catalog</p>
          <div className="plan-title-row">
            <h2>{displayName || "Untitled plan"}</h2>
            <span className={isActive ? "statuspill status-active" : "statuspill"}>
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="muted plan-key">{plan.key} · {formatAmount(Number(amountMinor || 0))} / {billingInterval.toLowerCase()}</p>
        </div>
        <button className="pill" type="button" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>

      <div className="plan-fields">
        <div>
          <label htmlFor={`${plan.id}-name`}>Display name</label>
          <input id={`${plan.id}-name`} className="input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </div>
        <div>
          <label htmlFor={`${plan.id}-amount`}>Monthly amount (poisha)</label>
          <input id={`${plan.id}-amount`} className="input" type="number" min="0" value={amountMinor} onChange={(event) => setAmountMinor(event.target.value)} />
        </div>
        <div>
          <label htmlFor={`${plan.id}-billing`}>Billing interval</label>
          <select id={`${plan.id}-billing`} className="input" value={billingInterval} onChange={(event) => setBillingInterval(event.target.value as EditablePlan["billingInterval"])}>
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
          </select>
        </div>
      </div>

      <div className="plan-editor-bar">
        <div>
          <p className="eyebrow">Entitlements</p>
          <p className="muted">Turn capabilities on or off. Leave a limit empty for unlimited access.</p>
        </div>
        <label className="toggle-label">
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
          Plan available for new subscriptions
        </label>
      </div>

      <div className="entitlement-list">
        {entitlements.map((entitlement, index) => (
          <div className={`entitlement-row${entitlement.enabled ? "" : " is-disabled"}`} key={entitlement.featureKey}>
            <input type="checkbox" checked={entitlement.enabled} onChange={(event) => updateEntitlement(index, { enabled: event.target.checked })} aria-label={`Enable ${labelFor(entitlement.featureKey)}`} />
            <div className="entitlement-copy">
              <strong>{labelFor(entitlement.featureKey)}</strong>
              <span className="muted">{entitlement.featureKey}</span>
            </div>
            <input
              className="limit-input"
              type="number"
              min="0"
              placeholder="Unlimited"
              value={entitlement.limit ?? ""}
              onChange={(event) => updateEntitlement(index, { limit: event.target.value === "" ? null : Number(event.target.value) })}
              aria-label={`${labelFor(entitlement.featureKey)} limit`}
            />
          </div>
        ))}
      </div>

      <div className="add-feature">
        <input className="input" value={newFeature} onChange={(event) => setNewFeature(event.target.value)} placeholder="Add feature key, e.g. whatsapp_support" />
        <button className="secondary-button" type="button" onClick={addFeature}>Add feature</button>
      </div>
      {message && <p className={message === "Saved" ? "save-message" : "error-message"}>{message}</p>}
    </section>
  );
}
