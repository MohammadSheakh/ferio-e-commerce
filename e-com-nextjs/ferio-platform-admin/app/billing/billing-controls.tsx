"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  readJsonRecord,
  responseDataNumber,
  responseDataString,
  responseMessage,
} from "@/lib/client-response";

async function request(path: string, method: "GET" | "POST", body?: unknown) {
  const response = await fetch(`/api/platform${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await readJsonRecord(response);
  if (!response.ok) throw new Error(responseMessage(payload, "Billing request failed."));
  return payload;
}

export function BillingControls() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void request("/platform/billing/billing-configured", "GET")
      .then((payload) => {
        if (cancelled) return;
        const data = payload.data;
        setConfigured(
          typeof data === "object" && data !== null &&
            typeof (data as Record<string, unknown>).configured === "boolean"
            ? Boolean((data as Record<string, unknown>).configured)
            : null,
        );
      })
      .catch((error: unknown) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Readiness check failed.");
      });
    return () => { cancelled = true; };
  }, []);

  async function createInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const organizationId = String(form.get("organizationId") ?? "").trim();
    const reason = String(form.get("reason") ?? "").trim();
    const periodStart = String(form.get("periodStart") ?? "");
    const periodEnd = String(form.get("periodEnd") ?? "");
    if (!organizationId || reason.length < 10 || !periodStart || !periodEnd) {
      setMessage("Organization, dates, and a reason of at least 10 characters are required.");
      setWorking(false);
      return;
    }
    try {
      const payload = await request("/platform/billing/invoices", "POST", {
        organizationId,
        periodStart: new Date(`${periodStart}T00:00:00Z`).toISOString(),
        periodEnd: new Date(`${periodEnd}T00:00:00Z`).toISOString(),
        reason,
      });
      setMessage(`Invoice ${responseDataString(payload, "number", "created")} created.`);
      window.setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invoice creation failed.");
    } finally {
      setWorking(false);
    }
  }

  async function recover() {
    setWorking(true);
    setMessage("");
    try {
      const payload = await request("/platform/billing/payment-attempts/recover", "POST", { staleAfterMinutes: 30 });
      setMessage(`Recovery completed: ${responseDataNumber(payload, "recovered", 0)} stale attempt(s).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Recovery failed.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="card">
      <p className="eyebrow">Billing operations</p>
      <p className="muted">
        Provider readiness: {configured === null ? "checking…" : configured ? "configured" : "not configured"}.
        Callback processing remains gateway-owned and is not simulated here.
      </p>
      <form onSubmit={createInvoice}>
        <div className="grid3">
          <label>Organization ID<input name="organizationId" required className="input" /></label>
          <label>Period start<input name="periodStart" type="date" required className="input" /></label>
          <label>Period end<input name="periodEnd" type="date" required className="input" /></label>
        </div>
        <label style={{ display: "block", marginTop: 10 }}>
          Reason
          <textarea name="reason" required minLength={10} maxLength={500} className="input" rows={2} />
        </label>
        <button className="pill" disabled={working} style={{ marginTop: 10 }}>Create invoice</button>
        <button
          type="button"
          className="pill"
          disabled={working}
          onClick={() => void recover()}
          style={{ marginTop: 10, marginLeft: 8, background: "#ffffff", color: "#111114", border: "1px solid #e8e8ea" }}
        >
          Recover stale attempts
        </button>
      </form>
      {message && <p className="muted" role="status">{message}</p>}
    </div>
  );
}

export function InvoiceActions({ invoiceId, paid }: { invoiceId: string; paid: boolean }) {
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function pay() {
    setWorking("pay");
    setMessage("");
    try {
      const payload = await request(`/platform/billing/invoices/${invoiceId}/pay`, "POST", {
        reason: "Operator initiated invoice payment session",
      });
      const url = responseDataString(payload, "gatewayUrl");
      setMessage(url ? "Payment session ready." : "Payment session created.");
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Payment initiation failed.");
    } finally {
      setWorking(null);
    }
  }

  async function receipt() {
    setWorking("receipt");
    setMessage("");
    try {
      const payload = await request(`/platform/billing/invoices/${invoiceId}/receipt`, "GET");
      setMessage(`Receipt ${responseDataString(payload, "receiptNumber", "ready")}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Receipt lookup failed.");
    } finally {
      setWorking(null);
    }
  }

  return (
    <div>
      {!paid && <button className="pill" disabled={working !== null} onClick={() => void pay()}>{working === "pay" ? "Starting…" : "Pay"}</button>}
      <button className="pill" disabled={working !== null} onClick={() => void receipt()} style={{ marginLeft: 6 }}>{working === "receipt" ? "Loading…" : "Receipt"}</button>
      {message && <small className="muted" style={{ display: "block", marginTop: 4 }}>{message}</small>}
    </div>
  );
}
