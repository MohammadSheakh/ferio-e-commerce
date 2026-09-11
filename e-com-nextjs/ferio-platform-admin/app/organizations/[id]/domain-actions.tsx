"use client";

import { useState } from "react";
import {
  readJsonRecord,
  responseData,
  responseDataString,
  responseMessage,
} from "@/lib/client-response";

type Domain = {
  id: string;
  hostname: string;
  type: string;
  status: string;
  isPrimary: boolean;
};

function readDomain(value: unknown): Domain | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.hostname !== "string" ||
    typeof record.type !== "string" ||
    typeof record.status !== "string" ||
    typeof record.isPrimary !== "boolean"
  ) {
    return null;
  }
  return {
    id: record.id,
    hostname: record.hostname,
    type: record.type,
    status: record.status,
    isPrimary: record.isPrimary,
  };
}

export function DomainActions({
  organizationId,
  domains,
}: {
  organizationId: string;
  domains: Domain[];
}) {
  const [domainList, setDomainList] = useState(domains);
  const [hostname, setHostname] = useState("");
  const [verificationTokens, setVerificationTokens] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState<string | null>(null);

  async function call(action: string, path: string, body?: unknown) {
    setWorking(action);
    setMessage("");
    try {
      const response = await fetch(`/api/platform${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const payload = await readJsonRecord(response);
      if (!response.ok) {
        setMessage(responseMessage(payload, `${action} failed.`));
        return;
      }

      const data = responseData(payload);
      if (action === "Add domain") {
        const domain = readDomain(data.domain);
        const token = responseDataString(payload, "verificationToken");
        if (domain) {
          setDomainList((current) => [...current, domain]);
          if (token) {
            setVerificationTokens((current) => ({ ...current, [domain.id]: token }));
          }
        }
      }
      setMessage(`${action} OK.`);
      if (action !== "Add domain") window.location.reload();
    } catch {
      setMessage(`${action} failed: control plane unavailable.`);
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="card">
      <p className="eyebrow">Domain lifecycle</p>
      <p className="muted">
        Register a hostname, publish its verification token, then verify it after DNS/TLS readiness.
      </p>
      <div className="row" style={{ flexWrap: "wrap" }}>
        <input
          aria-label="Custom hostname"
          placeholder="shop.example.com"
          value={hostname}
          onChange={(event) => setHostname(event.target.value)}
          style={{ minWidth: 240 }}
        />
        <button
          className="pill"
          disabled={working !== null || hostname.trim().length < 3}
          onClick={() => {
            void call("Add domain", `/platform/organizations/${organizationId}/domains/custom`, {
              hostname: hostname.trim(),
            });
          }}
        >
          {working === "Add domain" ? "Registering…" : "Register domain"}
        </button>
      </div>

      {domainList.map((domain) => (
        <div key={domain.id} style={{ marginTop: 16 }}>
          <p style={{ margin: 0 }}>
            <strong>{domain.hostname}</strong> · {domain.status}
            {domain.isPrimary ? " · primary" : ""}
          </p>
          {domain.type === "CUSTOM" && domain.status === "PENDING_VERIFICATION" && (
            <div className="row" style={{ flexWrap: "wrap", marginTop: 8 }}>
              <input
                aria-label={`Verification token for ${domain.hostname}`}
                placeholder="ferio-verify=…"
                value={verificationTokens[domain.id] ?? ""}
                onChange={(event) =>
                  setVerificationTokens((current) => ({ ...current, [domain.id]: event.target.value }))
                }
                style={{ minWidth: 240 }}
              />
              <button
                className="pill"
                disabled={working !== null || !verificationTokens[domain.id]?.trim()}
                onClick={() =>
                  void call(
                    "Verify domain",
                    `/platform/organizations/${organizationId}/domains/${domain.id}/verify`,
                    { verificationToken: verificationTokens[domain.id].trim() },
                  )
                }
              >
                {working === "Verify domain" ? "Verifying…" : "Verify"}
              </button>
            </div>
          )}
          <div className="row" style={{ flexWrap: "wrap", marginTop: 8 }}>
            {domain.status === "ACTIVE" && !domain.isPrimary && (
              <button
                className="pill"
                disabled={working !== null}
                onClick={() =>
                  void call(
                    "Set primary",
                    `/platform/organizations/${organizationId}/domains/${domain.id}/primary`,
                  )
                }
              >
                {working === "Set primary" ? "Updating…" : "Set primary"}
              </button>
            )}
            {domain.status !== "DISABLED" && (
              <button
                className="pill"
                style={{ background: "#ffffff", color: "#111114", border: "1px solid #e8e8ea" }}
                disabled={working !== null}
                onClick={() => {
                  if (window.confirm(`Disable ${domain.hostname}?`)) {
                    void call(
                      "Disable domain",
                      `/platform/organizations/${organizationId}/domains/${domain.id}/disable`,
                    );
                  }
                }}
              >
                {working === "Disable domain" ? "Disabling…" : "Disable"}
              </button>
            )}
          </div>
        </div>
      ))}
      {message && <p className="muted" style={{ marginBottom: 0 }}>{message}</p>}
    </div>
  );
}
