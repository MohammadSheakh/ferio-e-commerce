"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import type {
  CommerceMessagePage,
  CommerceMessageStatus,
  TransactionalMessageQueueHealth,
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
  policy: {
    id: "transactional-default",
    enabled: false,
    version: 1,
    channelPriority: [],
    fallbackOnDefinitiveFailure: true,
    activationAllowed: false,
    channels: [],
  },
};

export default function TransactionalMessagesPage() {
  const [messages, setMessages] = useState(emptyPage);
  const [status, setStatus] = useState<CommerceMessageStatus | "ALL">("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [health, setHealth] = useState<TransactionalMessageQueueHealth | null>(null);
  const [retryingId, setRetryingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (status !== "ALL") query.set("status", status);
      if (search) query.set("search", search);
      const [response, healthResponse] = await Promise.all([
        fetch(`/api/transactional-messages?${query}`, { cache: "no-store" }),
        fetch("/api/transactional-messages/queue-health", { cache: "no-store" }),
      ]);
      const payload = (await response.json()) as {
        data?: CommerceMessagePage;
        message?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.message || "Unable to load message outbox.");
      }
      setMessages(payload.data);
      const healthPayload = (await healthResponse.json()) as { data?: TransactionalMessageQueueHealth };
      setHealth(healthPayload.data ?? null);
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

  async function retryMessage(messageId: string) {
    setRetryingId(messageId);
    setError("");
    try {
      const response = await fetch(`/api/transactional-messages/${messageId}/retry`, { method: "POST" });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message || "Unable to retry message.");
      await load();
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "Unable to retry message.");
    } finally {
      setRetryingId("");
    }
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

        <section className="grid gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-3">
          <div className="bg-white p-5"><p className="text-[11px] uppercase tracking-eyebrow text-ink2">Routing policy</p><p className="mt-2 text-[14px] font-medium text-ink">{messages.policy.enabled ? `Active · v${messages.policy.version}` : `Inactive · v${messages.policy.version}`}</p><p className="mt-1 text-[12px] text-ink2">{messages.policy.channelPriority.join(" → ") || "Priority awaiting approval"}</p></div>
          <div className="bg-white p-5"><p className="text-[11px] uppercase tracking-eyebrow text-ink2">Provider readiness</p><p className="mt-2 text-[14px] font-medium text-ink">{messages.policy.channels.filter((channel) => channel.configured).length} of 3 configured</p><p className="mt-1 text-[12px] text-ink2">Credentials remain outside application settings.</p></div>
          <div className="bg-white p-5"><p className="text-[11px] uppercase tracking-eyebrow text-ink2">Dispatch queue</p><p className="mt-2 text-[14px] font-medium text-ink">{health?.available ? "Available" : "Unavailable"} · {health?.eligibleCount ?? 0} eligible</p><p className="mt-1 text-[12px] text-ink2">{health?.dispatchEnabled ? `Sweep every ${health.everyMinutes} minutes` : "Deployment switch disabled"}</p></div>
        </section>

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
          <table className="w-full min-w-[1080px] text-left">
            <thead><tr className="text-[11px] uppercase tracking-eyebrow text-ink2"><th className="px-5 py-3 font-normal">Event</th><th className="px-5 py-3 font-normal">Reference</th><th className="px-5 py-3 font-normal">Recipient</th><th className="px-5 py-3 font-normal">Route</th><th className="px-5 py-3 font-normal">Evidence</th><th className="px-5 py-3 font-normal">Created</th><th className="px-5 py-3 font-normal">Status</th><th className="px-5 py-3 font-normal">Action</th></tr></thead>
            <tbody className="divide-y divide-line">
              {messages.items.map((message) => <tr key={message.id} className="text-[13px]"><td className="px-5 py-3.5"><p className="font-medium text-ink">{message.eventType.replaceAll("_", " ").toLowerCase()}</p><p className="text-[11px] text-ink2">{message.templateKey}</p></td><td className="px-5 py-3.5 text-ink2">{message.referenceType} · {message.referenceId}</td><td className="px-5 py-3.5 text-ink2">{message.recipient}</td><td className="px-5 py-3.5 text-ink2"><p>{message.selectedChannel || message.channelPlan.join(" → ") || "Policy pending"}</p>{message.fallbackReason && <p className="mt-1 text-[11px] text-amber-700">Fallback: {message.fallbackReason}</p>}</td><td className="px-5 py-3.5 text-ink2"><p>{message.attempts.length} attempt{message.attempts.length === 1 ? "" : "s"}</p>{message.terminalReason && <p className="mt-1 max-w-64 text-[11px] text-rose-700">{message.terminalReason}</p>}</td><td className="px-5 py-3.5 text-ink2">{new Date(message.createdAt).toLocaleString("en-BD")}</td><td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-[11px] ${commerceMessageStatusClass(message.status)}`}>{message.status.toLowerCase()}</span></td><td className="px-5 py-3.5">{(message.status === "FAILED" || message.status === "BLOCKED") && <button disabled={!messages.dispatchConfigured || retryingId === message.id} onClick={() => void retryMessage(message.id)} className="rounded-full border border-line px-3 py-1.5 text-[11px] text-ink disabled:cursor-not-allowed disabled:opacity-40">{retryingId === message.id ? "Queueing…" : "Retry"}</button>}</td></tr>)}
              {!loading && messages.items.length === 0 && <tr><td colSpan={8} className="px-5 py-14 text-center text-[13px] text-ink2">No transactional events match this view.</td></tr>}
              {loading && <tr><td colSpan={8} className="px-5 py-14 text-center text-[13px] text-ink2">Loading message outbox…</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
