"use client";

import { FormEvent, useState } from "react";
import { readJsonRecord, responseMessage } from "@/lib/client-response";

export function FeatureFlagForm() {
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const key = String(form.get("key") ?? "").trim().toLowerCase();
    const note = String(form.get("note") ?? "").trim();
    if (!/^[a-z][a-z0-9_.:-]{0,119}$/.test(key)) {
      setMessage("Use a valid lowercase flag key.");
      setWorking(false);
      return;
    }
    try {
      const response = await fetch(`/api/platform/feature-flags/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: form.get("enabled") === "on", note: note || null }),
      });
      const payload = await readJsonRecord(response);
      if (!response.ok) throw new Error(responseMessage(payload, "Feature flag update failed."));
      setMessage("Feature flag saved.");
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Feature flag update failed.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <form onSubmit={submit} className="card">
      <p className="eyebrow">Set flag</p>
      <div className="row" style={{ flexWrap: "wrap", alignItems: "end" }}>
        <label>Key<input name="key" required className="input" placeholder="platform.example" /></label>
        <label className="toggle-label"><input name="enabled" type="checkbox" /> Enabled</label>
        <label>Note<input name="note" maxLength={500} className="input" placeholder="Reason or rollout note" /></label>
        <button className="pill" disabled={working}>{working ? "Saving…" : "Save flag"}</button>
      </div>
      {message && <p className="muted" role="status">{message}</p>}
    </form>
  );
}
