"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import type {
  CommerceMessagePage,
  CommerceMessageStatus,
} from "@/lib/transactional-messages";
import { commerceMessageStatusClass } from "@/lib/transactional-messages";

const emptyPage: CommerceMessagePage = {
  items: [],
  page: 1,
  limit: 30,
  total: 0,
  totalPages: 0,
  counts: {},
  dispatchConfigured: false,
  dispatchNote: "",
};

export default function TransactionalMessagesPage() {
  const [messages, setMessages] = useState(emptyPage);
  const [status, setStatus] = useState<CommerceMessageStatus | "ALL">("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (status !== "ALL") query.set("status", status);
      if (search) query.set("search", search);
      const response = await fetch(`/api/transactional-messages?${query}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: CommerceMessagePage;
        message?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.message || "Unable to load message outbox.");
      }
      setMessages(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load message outbox.");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => { void load(); }, [load]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  return (
    <>
      <Topbar title="Messages" subtitle={`${messages.total} transactional events`} />
      <div className="space-y-7 p-8">
        {!messages.dispatchConfigured && (
          <section className="rounded-card border border-amber-200 bg-amber-50/60 p-5">
            <h2 className="text-[13px] font-medium text-amber-900">Durable outbox active · dispatch intentionally disabled</h2>
            <p className="mt-1 text-[12px] leading-5 text-amber-800">{messages.dispatchNote || "Approve channel priority and provider credentials before enabling delivery."}</p>
          </section>
        )}

        <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {(["QUEUED", "PROCESSING", "SENT", "DELIVERED", "FAILED", "BLOCKED"] as CommerceMessageStatus[]).map((item) => (
            <button key={item} onClick={() => setStatus(status === item ? "ALL" : item)} className={`rounded-card border p-4 text-left transition ${status === item ? "border-ink" : "border-line hover:border-ink/40"}`}>
              <span className="text-[11px] uppercase tracking-eyebrow text-ink2">{item.toLowerCase()}</span>
              <span className="mt-2 block text-[22px] font-semibold tracking-tight text-ink">{messages.counts[item] ?? 0}</span>
            </button>
          ))}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><h2 className="text-[16px] font-medium text-ink">Transactional outbox</h2><p className="mt-1 text-[12px] text-ink2">Recipients are masked in queue views. Provider payloads remain backend-only.</p></div>
          <form onSubmit={submitSearch} className="flex gap-2"><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Event or reference ID" className="w-64 rounded-full border border-line px-4 py-2 text-[13px] outline-none focus:border-ink" /><button className="rounded-full bg-ink px-5 py-2 text-[13px] text-white">Search</button></form>
        </div>

        {error && <p role="alert" className="text-[13px] text-rose-700">{error}</p>}
        <div className="overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[900px] text-left">
            <thead><tr className="text-[11px] uppercase tracking-eyebrow text-ink2"><th className="px-5 py-3 font-normal">Event</th><th className="px-5 py-3 font-normal">Reference</th><th className="px-5 py-3 font-normal">Recipient</th><th className="px-5 py-3 font-normal">Channel</th><th className="px-5 py-3 font-normal">Attempts</th><th className="px-5 py-3 font-normal">Created</th><th className="px-5 py-3 font-normal">Status</th></tr></thead>
            <tbody className="divide-y divide-line">
              {messages.items.map((message) => <tr key={message.id} className="text-[13px]"><td className="px-5 py-3.5"><p className="font-medium text-ink">{message.eventType.replaceAll("_", " ").toLowerCase()}</p><p className="text-[11px] text-ink2">{message.templateKey}</p></td><td className="px-5 py-3.5 text-ink2">{message.referenceType} · {message.referenceId}</td><td className="px-5 py-3.5 text-ink2">{message.recipient}</td><td className="px-5 py-3.5 text-ink2">{message.selectedChannel || "Policy pending"}</td><td className="px-5 py-3.5 text-ink2">{message.attempts.length}</td><td className="px-5 py-3.5 text-ink2">{new Date(message.createdAt).toLocaleString("en-BD")}</td><td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-[11px] ${commerceMessageStatusClass(message.status)}`}>{message.status.toLowerCase()}</span></td></tr>)}
              {!loading && messages.items.length === 0 && <tr><td colSpan={7} className="px-5 py-14 text-center text-[13px] text-ink2">No transactional events match this view.</td></tr>}
              {loading && <tr><td colSpan={7} className="px-5 py-14 text-center text-[13px] text-ink2">Loading message outbox…</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
