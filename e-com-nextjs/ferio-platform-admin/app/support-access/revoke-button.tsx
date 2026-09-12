"use client";
import { useState } from "react";
import { readJsonRecord, responseMessage } from "@/lib/client-response";

export function RevokeButton({ grantId }: { grantId: string }) {
  const [working, setWorking] = useState(false);
  return (
    <button
      className="pill"
      style={{ background: "#ffffff", color: "#111114", border: "1px solid #e8e8ea" }}
      disabled={working}
      onClick={async () => {
        setWorking(true);
        try {
          const response = await fetch(`/api/platform/support-access/${grantId}/revoke`, { method: "POST" });
          if (!response.ok) {
            const data = await readJsonRecord(response);
            throw new Error(responseMessage(data, "Unable to revoke support access."));
          }
          window.location.reload();
        } catch (error) {
          window.alert(error instanceof Error ? error.message : "Unable to revoke support access.");
          setWorking(false);
        }
      }}
    >
      {working ? "Revoking…" : "Revoke"}
    </button>
  );
}
