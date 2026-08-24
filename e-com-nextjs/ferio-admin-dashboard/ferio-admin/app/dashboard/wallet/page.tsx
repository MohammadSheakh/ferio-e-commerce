"use client";

import { useEffect, useState } from "react";
import type { AdminWalletTopUpPage } from "@/lib/wallet";

const money = (amount: number) =>
  new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT" }).format(amount / 100);

export default function AdminWalletPage() {
  const [data, setData] = useState<AdminWalletTopUpPage | null>(null);
  const [status, setStatus] = useState("PENDING_REVIEW");
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState("");
  const [error, setError] = useState("");

  async function load(page = 1) {
    setError("");
    const query = new URLSearchParams({ page: String(page), limit: "30" });
    if (status) query.set("status", status);
    if (search.trim()) query.set("search", search.trim());
    const response = await fetch(`/api/wallet/top-ups?${query}`, { cache: "no-store" });
    const payload = await response.json();
    if (response.ok) setData(payload.data);
    else setError(payload.message || "Unable to load wallet top-ups.");
  }

  useEffect(() => { void load(); }, [status]);

  async function review(id: string, nextStatus: "COMPLETED" | "REJECTED") {
    const reviewNote = notes[id]?.trim();
    if (!reviewNote) {
      setError("Write a review note before approving or rejecting a top-up.");
      return;
    }
    setPendingId(id);
    setError("");
    const response = await fetch(`/api/wallet/top-ups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, reviewNote }),
    });
    const payload = await response.json();
    if (response.ok) {
      setNotes((current) => ({ ...current, [id]: "" }));
      await load(data?.page ?? 1);
    } else setError(payload.message || "Unable to review the top-up.");
    setPendingId("");
  }

  return (
    <main className="space-y-8 p-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-ink2">Finance operations</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Customer wallets</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink2">Review customer-submitted bKash, Nagad, Rocket, and bank references. Approval credits the wallet once through an immutable ledger entry.</p>
      </div>

      <section className="grid gap-3 border-y border-line py-5 md:grid-cols-[1fr_220px_auto]">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Customer, email, or transaction reference" className="rounded-md border border-line bg-white px-4 py-2.5 text-sm text-ink" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-md border border-line bg-white px-4 py-2.5 text-sm text-ink">
          <option value="">All statuses</option>
          <option value="PENDING_REVIEW">Pending review</option>
          <option value="COMPLETED">Completed</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button onClick={() => void load(1)} className="rounded-full bg-ink px-5 py-2.5 text-sm text-white">Search</button>
      </section>

      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</p>}

      <section className="space-y-4">
        {data?.items.length ? data.items.map((item) => (
          <article key={item.id} className="rounded-md border border-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-ink">{item.user.name}</h2>
                  <span className="rounded-full border border-line px-2.5 py-0.5 text-[10px] uppercase tracking-wide text-ink2">{item.status.replaceAll("_", " ")}</span>
                </div>
                <p className="mt-1 text-xs text-ink2">{item.user.email}</p>
                <p className="mt-4 text-sm text-ink"><span className="font-medium">{item.provider.replace("_", " ")}</span> · {item.customerReference}</p>
                <p className="mt-1 text-xs text-ink2">Submitted {new Date(item.createdAt).toLocaleString()}</p>
                {item.customerNote && <p className="mt-3 text-xs leading-5 text-ink2">Customer note: {item.customerNote}</p>}
                {item.reviewNote && <p className="mt-3 text-xs leading-5 text-ink2">Review note: {item.reviewNote}</p>}
              </div>
              <p className="text-xl font-semibold text-ink">{money(item.amount)}</p>
            </div>
            {item.status === "PENDING_REVIEW" && (
              <div className="mt-5 grid gap-3 border-t border-line pt-5 md:grid-cols-[1fr_auto_auto]">
                <input value={notes[item.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} maxLength={500} placeholder="Required verification or rejection note" className="rounded-md border border-line px-4 py-2.5 text-sm text-ink" />
                <button disabled={pendingId === item.id} onClick={() => void review(item.id, "REJECTED")} className="rounded-full border border-line px-5 py-2.5 text-xs text-ink disabled:opacity-40">Reject</button>
                <button disabled={pendingId === item.id} onClick={() => void review(item.id, "COMPLETED")} className="rounded-full bg-ink px-5 py-2.5 text-xs text-white disabled:opacity-40">Approve credit</button>
              </div>
            )}
          </article>
        )) : <div className="rounded-md border border-dashed border-line py-14 text-center text-sm text-ink2">No wallet top-ups match these filters.</div>}
      </section>

      {data && data.totalPages > 1 && <div className="flex items-center justify-between text-xs text-ink2">
        <button disabled={data.page <= 1} onClick={() => void load(data.page - 1)} className="rounded-full border border-line px-4 py-2 disabled:opacity-30">Previous</button>
        <span>Page {data.page} of {data.totalPages}</span>
        <button disabled={data.page >= data.totalPages} onClick={() => void load(data.page + 1)} className="rounded-full border border-line px-4 py-2 disabled:opacity-30">Next</button>
      </div>}
    </main>
  );
}
