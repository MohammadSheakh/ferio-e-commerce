"use client";

import { useState } from "react";
import Link from "next/link";
import { readJsonRecord, responseMessage } from "@/lib/client-response";

interface OrgRowActionsProps {
  organizationId: string;
  status: string;
}

export function OrgRowActions({ organizationId, status }: OrgRowActionsProps) {
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function call(
    action: string,
    path: string,
    body?: unknown,
    method: "POST" | "PATCH" | "DELETE" = "POST",
  ) {
    setWorking(action);
    setMessage("");
    try {
      const cleanPath = path.startsWith("/platform") ? path.slice(9) : path;
      const res = await fetch(`/api/platform${cleanPath}`, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await readJsonRecord(res);
      if (res.ok) {
        window.location.reload();
      } else {
        setMessage(responseMessage(data, `${action} failed.`));
      }
    } catch {
      setMessage(`${action} failed.`);
    } finally {
      setWorking(null);
    }
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
      {status === "ACTIVE" && (
        <button
          className="pill"
          style={{
            padding: "4px 10px",
            fontSize: 12,
            background: "#ffffff",
            color: "#111114",
            border: "1px solid #e8e8ea",
          }}
          disabled={working !== null}
          onClick={() =>
            call(
              "Suspend",
              `/organizations/${organizationId}/status`,
              {
                status: "SUSPENDED",
                reason: "Suspended via Platform Admin",
              },
              "PATCH",
            )
          }
        >
          {working === "Suspend" ? "Suspending…" : "Suspend"}
        </button>
      )}

      {status === "SUSPENDED" && (
        <button
          className="pill"
          style={{ padding: "4px 10px", fontSize: 12 }}
          disabled={working !== null}
          onClick={() =>
            call(
              "Reactivate",
              `/organizations/${organizationId}/status`,
              {
                status: "ACTIVE",
                reason: "Reactivated via Platform Admin",
              },
              "PATCH",
            )
          }
        >
          {working === "Reactivate" ? "Reactivating…" : "Live again"}
        </button>
      )}

      <button
        className="pill"
        style={{
          padding: "4px 10px",
          fontSize: 12,
          background: "#fee2e2",
          color: "#991b1b",
          border: "1px solid #fecaca",
        }}
        disabled={working !== null}
        onClick={() => {
          if (
            !window.confirm(
              "Are you sure you want to completely DELETE this organization? This action cannot be undone."
            )
          ) {
            return;
          }
          void call("Delete", `/organizations/${organizationId}`, undefined, "DELETE");
        }}
      >
        {working === "Delete" ? "Deleting…" : "Delete"}
      </button>

      <Link
        href={`/organizations/${organizationId}`}
        style={{ textDecoration: "underline", marginLeft: 4, fontSize: 13 }}
      >
        Manage
      </Link>

      {message && (
        <span style={{ fontSize: 11, color: "#dc2626", marginLeft: 6 }}>
          {message}
        </span>
      )}
    </div>
  );
}

