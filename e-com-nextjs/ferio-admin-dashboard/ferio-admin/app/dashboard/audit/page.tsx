"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import Pagination from "@/components/Pagination";
import CopyableId from "@/components/CopyableId";
import type { AuditLogPage, AuditSource } from "@/lib/audit";

const emptyPage: AuditLogPage = {
  items: [],
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
};

function snapshot(value: unknown) {
  if (value === null || value === undefined) return "Not recorded";
  return JSON.stringify(value, null, 2);
}

export default function AuditPage() {
  const [logs, setLogs] = useState(emptyPage);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [actionInput, setActionInput] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [source, setSource] = useState<AuditSource | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (action) query.set("action", action);
      if (entityType) query.set("entityType", entityType);
      if (source !== "ALL") query.set("source", source);
      const response = await fetch(`/api/audit-logs?${query}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: AuditLogPage;
        message?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.message || "Unable to load audit history.");
      }
      setLogs(payload.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load audit history.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, action, entityType, source]);

  useEffect(() => { void load(); }, [load]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAction(actionInput.trim());
  }

  return (
    <>
      <Topbar title="Audit history" subtitle={`${logs.total} append-only records`} />
      <div className="space-y-6 p-8">
        <section className="border-b border-line pb-6">
          <h2 className="text-[16px] font-medium text-ink">Sensitive admin actions</h2>
          <p className="mt-1 text-[12px] leading-5 text-ink2">Records identify the actor, action, entity, source, time, and safe before/after values. They cannot be edited or deleted here.</p>
          <form onSubmit={applyFilters} className="mt-5 flex flex-wrap gap-2">
            <input value={actionInput} onChange={(event) => setActionInput(event.target.value)} placeholder="Action contains…" className="w-56 rounded-full border border-line px-4 py-2 text-[13px] outline-none focus:border-ink" />
            <select value={entityType} onChange={(event) => setEntityType(event.target.value)} aria-label="Entity type" className="rounded-full border border-line px-4 py-2 text-[13px] text-ink2 outline-none focus:border-ink"><option value="">All entities</option><option value="CommerceSettings">Commerce settings</option><option value="Settings">Static content</option><option value="Category">Category</option><option value="Product">Product</option><option value="ProductVariant">Inventory</option><option value="DeliveryZone">Delivery zone</option><option value="CodVerificationPolicy">COD policy</option><option value="Order">Order</option><option value="ReturnCase">Return case</option><option value="FulfillmentException">Fulfillment exception</option><option value="ShipmentProvider">Courier provider</option><option value="Shipment">Shipment</option></select>
            <select value={source} onChange={(event) => setSource(event.target.value as AuditSource | "ALL")} aria-label="Audit source" className="rounded-full border border-line px-4 py-2 text-[13px] text-ink2 outline-none focus:border-ink"><option value="ALL">All sources</option><option value="ADMIN_API">Admin API</option><option value="SYSTEM">System</option><option value="JOB">Job</option><option value="PROVIDER">Provider</option></select>
            <button className="rounded-full bg-ink px-5 py-2 text-[13px] text-white">Apply</button>
          </form>
        </section>

        {error && <p role="alert" className="text-[13px] text-rose-700">{error}</p>}
        <div className="overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[980px] text-left">
            <thead><tr className="text-[11px] uppercase tracking-eyebrow text-ink2"><th className="px-4 py-3 font-normal w-24">Id</th><th className="px-5 py-3 font-normal">Action</th><th className="px-5 py-3 font-normal">Entity</th><th className="px-5 py-3 font-normal">Actor</th><th className="px-5 py-3 font-normal">Source</th><th className="px-5 py-3 font-normal">Time</th><th className="px-5 py-3 font-normal">Change</th></tr></thead>
            <tbody className="divide-y divide-line">
              {logs.items.map((entry) => <tr key={entry.id} className="align-top text-[13px]"><td className="px-4 py-4 w-24"><CopyableId id={entry.id} /></td><td className="px-5 py-4"><p className="font-medium text-ink">{entry.action.replaceAll("_", " ").toLowerCase()}</p></td><td className="px-5 py-4"><p className="text-ink">{entry.entityType}</p><p className="mt-0.5 max-w-48 truncate text-[11px] text-ink2" title={entry.entityId}>{entry.entityId}</p></td><td className="px-5 py-4"><p className="text-ink2">{entry.actorRole || "system"}</p><p className="mt-0.5 max-w-40 truncate text-[11px] text-ink2" title={entry.actorId || undefined}>{entry.actorId || "—"}</p></td><td className="px-5 py-4 text-ink2">{entry.source.replaceAll("_", " ").toLowerCase()}</td><td className="px-5 py-4 text-ink2">{new Date(entry.createdAt).toLocaleString("en-BD")}</td><td className="px-5 py-4"><details><summary className="cursor-pointer text-[12px] text-ink hover:underline">View safe values</summary><div className="mt-3 grid gap-3 md:grid-cols-2"><div><p className="text-[10px] uppercase tracking-eyebrow text-ink2">Before</p><pre className="mt-1 max-h-52 overflow-auto rounded-card bg-surface p-3 text-[11px] leading-5 text-ink2">{snapshot(entry.previousValue)}</pre></div><div><p className="text-[10px] uppercase tracking-eyebrow text-ink2">After</p><pre className="mt-1 max-h-52 overflow-auto rounded-card bg-surface p-3 text-[11px] leading-5 text-ink2">{snapshot(entry.newValue)}</pre></div></div>{entry.metadata !== null && <div className="mt-3"><p className="text-[10px] uppercase tracking-eyebrow text-ink2">Context</p><pre className="mt-1 max-h-40 overflow-auto rounded-card bg-surface p-3 text-[11px] leading-5 text-ink2">{snapshot(entry.metadata)}</pre></div>}</details></td></tr>)}
              {!loading && logs.items.length === 0 && <tr><td colSpan={7} className="px-5 py-14 text-center text-[13px] text-ink2">No audit records match this view.</td></tr>}
              {loading && <tr><td colSpan={7} className="px-5 py-14 text-center text-[13px] text-ink2">Loading audit history…</td></tr>}
            </tbody>
          </table>
          <Pagination
            currentPage={page}
            totalPages={logs.totalPages}
            totalItems={logs.total}
            pageSize={pageSize}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            isLoading={loading}
          />
        </div>
      </div>
    </>
  );
}
