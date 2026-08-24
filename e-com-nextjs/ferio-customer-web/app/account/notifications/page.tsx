"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CustomerNotificationPage } from "@/lib/customer-notifications";

export default function NotificationsPage() {
  const [data, setData] = useState<CustomerNotificationPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(page = 1) {
    setLoading(true);
    const response = await fetch(`/api/account/notifications?page=${page}&limit=20`, { cache: "no-store" });
    const payload = await response.json();
    if (response.ok) setData(payload.data);
    else setError(payload.message || "Unable to load notifications.");
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function markRead(id: string) {
    await fetch(`/api/account/notifications/${id}/read`, { method: "PATCH" });
    setData((current) => current ? { ...current, unread: Math.max(0, current.unread - 1), items: current.items.map((item) => item.id === id ? { ...item, isRead: true } : item) } : current);
  }

  async function markAllRead() {
    await fetch("/api/account/notifications/read-all", { method: "POST" });
    setData((current) => current ? { ...current, unread: 0, items: current.items.map((item) => ({ ...item, isRead: true })) } : current);
  }

  if (loading && !data) return <main className="mx-auto max-w-4xl px-6 py-20 text-[13px] text-ink2">Loading notifications…</main>;

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-eyebrow text-ink2">Customer account</p>
          <h1 className="mt-2 text-[30px] font-semibold tracking-tight text-ink">Notifications</h1>
          <p className="mt-2 text-[13px] text-ink2">Order, payment, wallet, warranty, and service updates appear here.</p>
        </div>
        <button disabled={!data?.unread} onClick={() => void markAllRead()} className="rounded-full border border-line px-5 py-2.5 text-[12px] text-ink disabled:opacity-40">Mark all read</button>
      </div>

      {error && <p className="mt-6 rounded-card border border-red-200 bg-red-50 p-4 text-[13px] text-red-900">{error}</p>}

      <div className="mt-10 divide-y divide-line border-y border-line">
        {data?.items.length ? data.items.map((notification) => (
          <article key={notification.id} className={`py-5 ${notification.isRead ? "opacity-65" : ""}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  {!notification.isRead && <span className="h-2 w-2 rounded-full bg-ink" aria-label="Unread" />}
                  <p className="text-[13px] font-medium text-ink">{notification.title}</p>
                </div>
                {notification.message && <p className="mt-2 text-[13px] leading-6 text-ink2">{notification.message}</p>}
                <p className="mt-2 text-[11px] text-ink2/70">{new Date(notification.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                {notification.linkFor && <Link href={notification.linkFor} onClick={() => !notification.isRead && void markRead(notification.id)} className="rounded-full border border-line px-3 py-1.5 text-[11px] text-ink">Open</Link>}
                {!notification.isRead && <button onClick={() => void markRead(notification.id)} className="rounded-full bg-ink px-3 py-1.5 text-[11px] text-white">Mark read</button>}
              </div>
            </div>
          </article>
        )) : <p className="py-12 text-center text-[13px] text-ink2">No notifications yet.</p>}
      </div>

      {data && data.totalPages > 1 && <div className="mt-8 flex justify-between text-[12px]">
        <button disabled={data.page <= 1} onClick={() => void load(data.page - 1)} className="rounded-full border border-line px-4 py-2 disabled:opacity-30">Previous</button>
        <span className="py-2 text-ink2">Page {data.page} of {data.totalPages}</span>
        <button disabled={data.page >= data.totalPages} onClick={() => void load(data.page + 1)} className="rounded-full border border-line px-4 py-2 disabled:opacity-30">Next</button>
      </div>}
    </main>
  );
}
