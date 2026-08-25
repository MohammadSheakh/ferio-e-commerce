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
      {status === "ACTIVE" && (
        <button
          className="pill"
          style={{ background: "#ffffff", color: "#111114", border: "1px solid #e8e8ea" }}
          disabled={working !== null}
          onClick={() => {
            const reason = window.prompt("Closure reason (recorded in the audit log):");
            if (!reason || reason.trim().length < 3) {
              setMessage("A reason is required to start closure.");
              return;
            }
            void call("Start closure", `/platform/organizations/${organizationId}/closure/initiate`, { reason: reason.trim() });
          }}
        >
          Start closure
        </button>
      )}
      {status === "CLOSURE_PENDING" && (
        <button
          className="pill"
          style={{ background: "#111114" }}
          disabled={working !== null}
          onClick={() => {
            if (!window.confirm("Finalize closure? The tenant database registry will be retired and the storefront becomes unreachable. This honors the retention window.")) return;
            void call("Finalize closure", `/platform/organizations/${organizationId}/closure/finalize`, {});
          }}
        >
          Finalize closure
        </button>
      )}
      {message && <span style={{ fontSize: 13, color: "#6e6e73" }}>{message}</span>}
    </div>
  );
}
