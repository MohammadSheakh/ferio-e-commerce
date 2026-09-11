"use client";

import { FormEvent, useState } from "react";
import { readJsonRecord, responseMessage } from "@/lib/client-response";

export function SupportGrantForm() {
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const organizationId = String(form.get("organizationId") ?? "").trim();
    const reason = String(form.get("reason") ?? "").trim();
    const ttlMinutes = Number(form.get("ttlMinutes") ?? 30);
    const rawScope = String(form.get("scope") ?? "").trim();
    if (!organizationId || reason.length < 10 || reason.length > 500) {
      setMessage("Organization ID and a reason of 10–500 characters are required.");
      setWorking(false);
      return;
    }
    if (!Number.isInteger(ttlMinutes) || ttlMinutes < 5 || ttlMinutes > 480) {
      setMessage("TTL must be an integer from 5 minutes to 8 hours.");
      setWorking(false);
      return;
    }
    let scope: Record<string, unknown> | undefined;
    if (rawScope) {
      try {
        const parsed: unknown = JSON.parse(rawScope);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          throw new Error("scope must be a JSON object");
        }
        scope = parsed as Record<string, unknown>;
      } catch {
        setMessage("Scope must be a valid JSON object, for example {\"orders\":\"read\"}.");
        setWorking(false);
        return;
      }
    }
    try {
      const response = await fetch("/api/platform/support-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          reason,
          ttlMinutes,
          ...(scope ? { scope } : {}),
        }),
      });
      const payload = await readJsonRecord(response);
      if (!response.ok) throw new Error(responseMessage(payload, "Grant request failed."));
      setMessage("Support grant created.");
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Grant request failed.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <form onSubmit={submit} className="card">
      <p className="eyebrow">Request support access</p>
      <div className="grid3">
        <label>Organization ID<input name="organizationId" required className="input" /></label>
        <label>TTL minutes<input name="ttlMinutes" type="number" min={5} max={480} defaultValue={30} className="input" /></label>
        <label>Scope JSON (optional)<input name="scope" className="input" placeholder='{"orders":"read"}' /></label>
      </div>
      <label style={{ display: "block", marginTop: 10 }}>
        Reason
        <textarea name="reason" required minLength={10} maxLength={500} className="input" rows={2} />
      </label>
      <button className="pill" disabled={working} style={{ marginTop: 10 }}>{working ? "Granting…" : "Grant access"}</button>
      {message && <p className="muted" role="status">{message}</p>}
    </form>
  );
}
