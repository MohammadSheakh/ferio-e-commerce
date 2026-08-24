"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function HeaderAccountNav() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [unread, setUnread] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/account/commerce", { cache: "no-store" });
        if (res.ok) {
          setIsLoggedIn(true);
          const payload = await res.json();
          const img =
            (payload.data?.account?.profileImageUrl as string) ||
            (payload.account?.profileImageUrl as string) ||
            (payload.data?.profileImageUrl as string) ||
            null;
          setAvatarUrl(img);

          const notificationResponse = await fetch(
            "/api/account/notifications/unread-count",
            { cache: "no-store" },
          );
          if (notificationResponse.ok) {
            const notificationPayload = await notificationResponse.json();
            setUnread(notificationPayload.data?.count ?? 0);
          }
        } else {
          setIsLoggedIn(false);
        }
      } catch {
        setIsLoggedIn(false);
      }
    }
    void checkAuth();
  }, []);

  if (isLoggedIn === true) {
    const showImage = Boolean(avatarUrl) && !imageError;

    return (
      <div className="flex items-center gap-5">
        <Link
          href="/account/orders"
          className="transition hover:text-ink font-medium text-ink"
        >
          Orders
        </Link>
        <Link
          href="/account/saved-carts"
          className="transition hover:text-ink font-medium text-ink"
        >
          Saved Carts
        </Link>
        
        {/* Colorful Green Wallet Icon with Tooltip */}
        <div className="relative group flex items-center justify-center">
          <Link
            href="/account/wallet"
            title="Wallet"
            className="relative transition hover:scale-105 flex items-center p-1"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              className="drop-shadow-xs"
            >
              <defs>
                <linearGradient id="walletGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
              <rect x="2" y="5" width="20" height="15" rx="3" fill="url(#walletGreenGrad)" />
              <path d="M2 9.5h20" stroke="#047857" strokeWidth="1" opacity="0.4" />
              <rect x="15" y="10.5" width="6" height="5" rx="1.5" fill="#A7F3D0" />
              <circle cx="17.5" cy="13" r="1" fill="#047857" />
            </svg>
          </Link>
          <div className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1 flex flex-col items-center z-[99999]">
            <div className="w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-slate-900" />
            <span className="whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xl">
              Wallet
            </span>
          </div>
        </div>

        {/* Notification Bell Icon with Tooltip */}
        <div className="relative group flex items-center justify-center">
          <Link
            href="/account/notifications"
            title="Notifications"
            className="relative transition hover:text-ink text-ink flex items-center p-1"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
          <div className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1 flex flex-col items-center z-[99999]">
            <div className="w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-slate-900" />
            <span className="whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xl">
              Notifications
            </span>
          </div>
        </div>

        {/* Logged in User Avatar / Profile Image with Tooltip */}
        <div className="relative group flex items-center justify-center">
          <Link
            href="/account"
            title="Account"
            className="flex items-center justify-center transition hover:opacity-85"
          >
            {showImage ? (
              <img
                src={avatarUrl!}
                alt="User Profile"
                className="h-8 w-8 rounded-full object-cover border border-slate-200 shadow-sm"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 border border-slate-200 shadow-sm">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            )}
          </Link>
          <div className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1 flex flex-col items-center z-[99999]">
            <div className="w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-slate-900" />
            <span className="whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xl">
              Account
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link href="/account/login" className="transition hover:text-ink">
      Sign in
    </Link>
  );
}
