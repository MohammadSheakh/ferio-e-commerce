"use client";
import { useState } from "react";

export function RevokeButton({ grantId }: { grantId: string }) {
  const [working, setWorking] = useState(false);
  return (
    <button
      className="pill"
      style={{ background: "#ffffff", color: "#111114", border: "1px solid #e8e8ea" }}
      disabled={working}
      onClick={async () => {
        setWorking(true);
        await fetch(`/api/platform/support-access/${grantId}/revoke`, { method: "POST" });
        window.location.reload();
      }}
    >
      {working ? "Revoking…" : "Revoke"}
    </button>
  );
}
