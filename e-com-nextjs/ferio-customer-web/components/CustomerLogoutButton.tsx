"use client";

import { useState } from "react";

export default function CustomerLogoutButton() {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await fetch("/api/account/logout", { method: "POST" });
        window.location.assign("/");
      }}
      className="text-[12px] text-ink2 underline underline-offset-4 disabled:opacity-40"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
