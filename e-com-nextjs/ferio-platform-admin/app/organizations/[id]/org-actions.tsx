"use client";
import { useState } from "react";

export function OrgActions({ organizationId, status }: { organizationId: string; status: string }) {
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState<string | null>(null);

  async function call(action: string, path: string, body?: unknown) {
    setWorking(action);
    setMessage("");
    const res = await fetch(`/api/platform${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res.json().catch(() => ({}));
    setWorking(null);
    setMessage(res.ok ? `${action} OK.` : data.message || `${action} failed.`);
    if (res.ok) window.location.reload();
  }

  return (
    <div className="row" style={{ flexWrap: "wrap" }}>
      <button
        className="pill"
        disabled={working !== null}
        onClick={() =>
          call("Provision", `/platform/organizations/${organizationId}/provision`, {})
        }
      >
        {working === "Provision" ? "Provisioning…" : "Run provisioning"}
      </button>
      {status === "ACTIVE" && (
        <button
          className="pill"
          style={{ background: "#ffffff", color: "#111114", border: "1px solid #e8e8ea" }}
          disabled={working !== null}
          onClick={() =>
            call("Suspend", `/platform/organizations/${organizationId}/status`, {
              status: "SUSPENDED",
              reason: "Suspended via Platform Admin",
            })
          }
        >
          Suspend
        </button>
      )}
      {status === "SUSPENDED" && (
        <button
          className="pill"
          disabled={working !== null}
          onClick={() =>
            call("Reactivate", `/platform/organizations/${organizationId}/status`, {
              status: "ACTIVE",
              reason: "Reactivated via Platform Admin",
            })
          }
        >
          Reactivate
        </button>
      )}
      {message && <span style={{ fontSize: 13, color: "#6e6e73" }}>{message}</span>}
    </div>
  );
}
