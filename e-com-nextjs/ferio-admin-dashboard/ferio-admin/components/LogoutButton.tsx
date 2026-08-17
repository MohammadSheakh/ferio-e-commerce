"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton({ isCollapsed }: { isCollapsed?: boolean }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  return (
    <button
      type="button"
      disabled={isPending}
      title={isCollapsed ? "Sign out" : undefined}
      onClick={async () => {
        setIsPending(true);
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/");
        router.refresh();
      }}
      className={`text-[12px] text-ink2 transition hover:text-rose-600 disabled:opacity-50 flex items-center gap-2 ${
        isCollapsed ? "justify-center p-2 text-[14px]" : "w-full"
      }`}
    >
      <span className="text-[14px]">🚪</span>
      {!isCollapsed && (
        <span>{isPending ? "Signing out…" : "Sign out"}</span>
      )}
    </button>
  );
}
