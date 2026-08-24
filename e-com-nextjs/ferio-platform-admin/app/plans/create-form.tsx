"use client";
import { useState, FormEvent } from "react";

export function CreatePlanForm() {
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const entitlementsRaw = String(form.get("entitlements") || "");
    // Format: featureKey[=limit],... e.g. "custom_domain,staff_seats=10"
    const entitlements = entitlementsRaw
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [featureKey, limit] = entry.split("=");
        return {
          featureKey,
          enabled: true,
          ...(limit ? { limit: Number(limit) } : {}),
        };
      });
    const response = await fetch("/api/platform/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: form.get("key"),
        displayName: form.get("displayName"),
        billingInterval: form.get("billingInterval"),
        amountMinor: Number(form.get("amountMinor") || 0),
        entitlements,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setWorking(false);
    if (response.ok) window.location.reload();
    else setMessage(data.message || "Plan creation failed.");
  }

  return (
    <form onSubmit={submit}>
      <div className="grid3">
        <div>
          <label htmlFor="key">Plan key</label>
          <input id="key" name="key" required className="input" placeholder="starter" />
        </div>
        <div>
          <label htmlFor="displayName">Display name</label>
          <input id="displayName" name="displayName" required className="input" placeholder="Starter" />
        </div>
        <div>
          <label htmlFor="amountMinor">Monthly amount (poisha)</label>
          <input id="amountMinor" name="amountMinor" type="number" min="0" defaultValue={0} className="input" />
        </div>
      </div>
      <div style={{ height: 14 }} />
      <div className="grid3">
        <div>
          <label htmlFor="billingInterval">Billing interval</label>
          <select id="billingInterval" name="billingInterval" className="input" defaultValue="MONTHLY">
            <option value="MONTHLY">MONTHLY</option>
            <option value="YEARLY">YEARLY</option>
          </select>
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <label htmlFor="entitlements">Entitlements — featureKey or featureKey=limit, comma-separated</label>
          <input id="entitlements" name="entitlements" className="input" placeholder="custom_domain,staff_seats=10,orders_per_month=1000" />
        </div>
      </div>
      <div style={{ height: 16 }} />
      <button className="pill" disabled={working}>{working ? "Creating…" : "Create plan"}</button>
      {message && <span style={{ marginLeft: 12, fontSize: 13, color: "#6e6e73" }}>{message}</span>}
    </form>
  );
}
