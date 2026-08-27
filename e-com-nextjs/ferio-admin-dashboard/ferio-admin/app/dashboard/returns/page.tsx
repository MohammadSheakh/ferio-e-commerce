"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import Pagination from "@/components/Pagination";
import RefundPanel from "@/components/returns/RefundPanel";
import type {
  ReturnCase,
  ReturnCasePage,
  ReturnCaseStatus,
} from "@/lib/returns";
import { returnStatusClass } from "@/lib/returns";

const fieldClass =
  "rounded-card border border-line bg-paper px-3 py-2.5 text-[12px] text-ink focus-visible:border-ink focus-visible:outline-none";

function formatEnum(value: string) {
  const label = value.replaceAll("_", " ").toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function ReviewForm({
  entry,
  reload,
}: {
  entry: ReturnCase;
  reload: () => void;
}) {
  const [decision, setDecision] = useState("APPROVE");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      const items =
        decision === "PARTIAL_APPROVE"
          ? entry.items.map((item) => ({
              returnItemId: item.id,
              approvedQuantity: Number(form.get(`quantity-${item.id}`)),
            }))
          : undefined;
      const response = await fetch(`/api/returns/${entry.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason: form.get("reason"), items }),
      });
      const payload = (await response.json()) as {
        data?: ReturnCase;
        message?: string;
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.message || "Unable to review return.");
      reload();
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Unable to review return.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={review} className="mt-5 border-t border-line pt-4">
      <div className="grid gap-3 md:grid-cols-[180px_1fr]">
        <select
          value={decision}
          onChange={(event) => setDecision(event.target.value)}
          aria-label="Review decision"
          className={fieldClass}
        >
          <option value="APPROVE">Approve request</option>
          <option value="PARTIAL_APPROVE">Partially approve</option>
          <option value="REJECT">Reject request</option>
        </select>
        <input
          required
          name="reason"
          minLength={3}
          maxLength={1000}
          placeholder="Required review reason"
          aria-label="Review reason"
          className={fieldClass}
        />
      </div>
      {decision === "PARTIAL_APPROVE" && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {entry.items.map((item) => (
            <label key={item.id} className="text-[11px] text-ink2">
              {item.orderItem.productName} approved quantity
              <input
                required
                name={`quantity-${item.id}`}
                type="number"
                min="0"
                max={item.requestedQuantity}
                defaultValue="0"
                className={`mt-1 w-full ${fieldClass}`}
              />
            </label>
          ))}
        </div>
      )}
      <button
        disabled={saving}
        className="mt-3 rounded-full bg-ink px-4 py-2 text-[12px] text-white disabled:opacity-40"
      >
        {saving ? "Saving…" : "Record decision"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-[11px] text-rose-700">
          {error}
        </p>
      )}
    </form>
  );
}

function InspectionForm({
  entry,
  reload,
}: {
  entry: ReturnCase;
  reload: () => void;
}) {
  const [decision, setDecision] = useState("ACCEPT");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function inspect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      const items = entry.items.map((item) => ({
        returnItemId: item.id,
        receivedQuantity: Number(form.get(`received-${item.id}`)),
        acceptedQuantity: Number(form.get(`accepted-${item.id}`)),
        condition: form.get(`condition-${item.id}`),
        inventoryDisposition: form.get(`disposition-${item.id}`),
        note: String(form.get(`note-${item.id}`) || "") || undefined,
      }));
      const response = await fetch(`/api/returns/${entry.id}/inspect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          finalResolution: form.get("finalResolution"),
          note: form.get("note"),
          items,
        }),
      });
      const payload = (await response.json()) as {
        data?: ReturnCase;
        message?: string;
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.message || "Unable to inspect return.");
      reload();
    } catch (inspectionError) {
      setError(
        inspectionError instanceof Error
          ? inspectionError.message
          : "Unable to inspect return.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={inspect} className="mt-5 border-t border-line pt-4">
      <p className="text-[12px] font-medium text-ink">
        Receive and inspect items
      </p>
      <p className="mt-1 text-[11px] leading-5 text-ink2">
        Sellable and damaged units update inventory. Quarantined and lost
        dispositions stay recorded without becoming available stock.
      </p>
      <div className="mt-4 space-y-4">
        {entry.items.map((item) => (
          <div
            key={item.id}
            className="grid gap-2 border-t border-line pt-4 md:grid-cols-2 xl:grid-cols-5"
          >
            <p className="text-[12px] text-ink md:col-span-2 xl:col-span-1">
              {item.orderItem.productName}
              <span className="block text-[11px] text-ink2">
                Approved {item.approvedQuantity ?? 0}
              </span>
            </p>
            <label className="text-[11px] text-ink2">
              Received
              <input
                required
                name={`received-${item.id}`}
                type="number"
                min="0"
                max={item.approvedQuantity ?? 0}
                defaultValue={item.approvedQuantity ?? 0}
                className={`mt-1 w-full ${fieldClass}`}
              />
            </label>
            <label className="text-[11px] text-ink2">
              Accepted
              <input
                required
                name={`accepted-${item.id}`}
                type="number"
                min="0"
                max={item.approvedQuantity ?? 0}
                defaultValue={
                  decision === "REJECT" ? 0 : (item.approvedQuantity ?? 0)
                }
                className={`mt-1 w-full ${fieldClass}`}
              />
            </label>
            <label className="text-[11px] text-ink2">
              Condition
              <select
                name={`condition-${item.id}`}
                className={`mt-1 w-full ${fieldClass}`}
              >
                <option value="SEALED">Sealed</option>
                <option value="UNUSED">Unused</option>
                <option value="OPENED">Opened</option>
                <option value="USED">Used</option>
                <option value="DAMAGED">Damaged</option>
                <option value="WRONG_ITEM">Wrong item</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label className="text-[11px] text-ink2">
              Disposition
              <select
                name={`disposition-${item.id}`}
                className={`mt-1 w-full ${fieldClass}`}
              >
                <option value="SELLABLE">Sellable</option>
                <option value="DAMAGED">Damaged</option>
                <option value="QUARANTINED">Quarantined</option>
                <option value="LOST">Lost</option>
              </select>
            </label>
            <input
              name={`note-${item.id}`}
              aria-label={`Optional inspection note for ${item.orderItem.productName}`}
              maxLength={500}
              placeholder="Optional item note"
              className={`${fieldClass} md:col-span-2 xl:col-span-5`}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[180px_180px_1fr]">
        <select
          value={decision}
          onChange={(event) => setDecision(event.target.value)}
          aria-label="Inspection decision"
          className={fieldClass}
        >
          <option value="ACCEPT">Accept received units</option>
          <option value="PARTIAL_ACCEPT">Partially accept</option>
          <option value="REJECT">Reject received units</option>
        </select>
        <select
          name="finalResolution"
          aria-label="Final resolution"
          className={fieldClass}
        >
          {decision === "REJECT" ? (
            <option value="REJECTED">Rejected</option>
          ) : (
            <>
              <option value="REFUND">Refund required</option>
              <option value="REPLACEMENT">Replacement required</option>
              <option value="EXCHANGE">Exchange required</option>
              <option value="OTHER">Other</option>
            </>
          )}
        </select>
        <input
          required
          name="note"
          minLength={3}
          maxLength={1000}
          placeholder="Required inspection note"
          aria-label="Inspection note"
          className={fieldClass}
        />
      </div>
      <button
        disabled={saving}
        className="mt-3 rounded-full bg-ink px-4 py-2 text-[12px] text-white disabled:opacity-40"
      >
        {saving ? "Recording…" : "Record inspection"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-[11px] text-rose-700">
          {error}
        </p>
      )}
    </form>
  );
}

export default function ReturnsPage() {
  const [page, setPage] = useState<ReturnCasePage | null>(null);
  const [status, setStatus] = useState<ReturnCaseStatus | "ALL">("REQUESTED");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({
        page: String(currentPage),
        limit: "30",
      });
      if (status !== "ALL") query.set("status", status);
      const response = await fetch(`/api/returns?${query}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: ReturnCasePage;
        message?: string;
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.message || "Unable to load returns.");
      setPage(payload.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load returns.",
      );
    } finally {
      setLoading(false);
    }
  }, [currentPage, status]);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <Topbar
        title="Returns"
        subtitle={`${page?.total ?? 0} cases in this view`}
      />
      <main className="p-4 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as ReturnCaseStatus | "ALL");
              setCurrentPage(1);
            }}
            aria-label="Return status"
            className={`${fieldClass} text-[13px] text-ink2`}
          >
            <option value="REQUESTED">Needs review</option>
            <option value="APPROVED">Approved for receipt</option>
            <option value="PARTIALLY_APPROVED">Partially approved</option>
            <option value="INSPECTED">Inspected</option>
            <option value="REJECTED">Rejected</option>
            <option value="ALL">All cases</option>
          </select>
          <p className="text-[12px] text-ink2">
            Inspection records stock disposition. Refund and replacement
            execution remain separate.
          </p>
        </div>
        {error && (
          <div
            role="alert"
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-rose-200 bg-rose-50 p-4 text-[12px] text-rose-700"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-full border border-rose-200 px-3 py-1.5 font-medium"
            >
              Retry return cases
            </button>
          </div>
        )}
        <div className="divide-y divide-line border-y border-line">
          {page?.items.map((entry) => (
            <article key={entry.id} className="py-6">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <Link
                    href={`/dashboard/orders/${entry.order.id}`}
                    className="text-[14px] font-medium text-ink hover:underline"
                  >
                    {entry.rmaReference} · {entry.order.reference}
                  </Link>
                  <p className="mt-1 text-[12px] text-ink2">
                    {entry.order.customer.name} ·{" "}
                    {entry.order.customer.phoneNormalized}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] ${entry.eligibilityStatus === "ELIGIBLE" ? "bg-emerald-50 text-emerald-700" : entry.eligibilityStatus === "INELIGIBLE" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}
                  >
                    {formatEnum(entry.eligibilityStatus)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] ${returnStatusClass(entry.status)}`}
                  >
                    {formatEnum(entry.status)}
                  </span>
                </div>
              </div>
              <p className="mt-4 text-[13px] text-ink">
                {formatEnum(entry.reason)} · requested{" "}
                {formatEnum(entry.requestedResolution).toLowerCase()}
              </p>
              <p className="mt-1 text-[12px] leading-5 text-ink2">
                {entry.description}
              </p>
              <div className="mt-3 text-[12px] text-ink2">
                {entry.items.map((item) => (
                  <p key={item.id}>
                    {item.orderItem.productName} · {item.orderItem.variantName}{" "}
                    × {item.requestedQuantity}
                    {item.approvedQuantity !== null
                      ? ` · approved ${item.approvedQuantity}`
                      : ""}
                    {item.receivedQuantity !== null
                      ? ` · received ${item.receivedQuantity} · ${item.inventoryDisposition ? formatEnum(item.inventoryDisposition).toLowerCase() : "not classified"}`
                      : ""}
                  </p>
                ))}
              </div>
              {entry.evidence.length > 0 && (
                <div className="mt-3 flex gap-3">
                  {entry.evidence.map((evidence, index) => (
                    <a
                      key={evidence.id}
                      href={evidence.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-ink2 underline decoration-line underline-offset-4"
                    >
                      Evidence {index + 1}
                    </a>
                  ))}
                </div>
              )}
              {["REQUESTED", "UNDER_REVIEW"].includes(entry.status) ? (
                <ReviewForm entry={entry} reload={() => void load()} />
              ) : ["APPROVED", "PARTIALLY_APPROVED"].includes(entry.status) ? (
                <InspectionForm entry={entry} reload={() => void load()} />
              ) : (
                <>
                  {entry.reviewReason && (
                    <p className="mt-4 border-t border-line pt-4 text-[12px] text-ink">
                      Decision reason: {entry.reviewReason}
                    </p>
                  )}
                  {entry.inspectionNote && (
                    <p className="mt-2 text-[12px] text-ink">
                      Inspection: {entry.inspectionNote} ·{" "}
                      {entry.finalResolution
                        ? formatEnum(entry.finalResolution).toLowerCase()
                        : "not classified"}
                    </p>
                  )}
                  {entry.status === "INSPECTED" &&
                    entry.finalResolution === "REFUND" && (
                      <RefundPanel
                        entry={entry}
                        reloadReturns={() => void load()}
                      />
                    )}
                </>
              )}
            </article>
          ))}
          {loading && !page?.items.length && (
            <p className="py-14 text-center text-[13px] text-ink2">
              Loading return cases…
            </p>
          )}
          {!loading && page?.items.length === 0 && (
            <p className="py-14 text-center text-[13px] text-ink2">
              No return cases in this view.
            </p>
          )}
        </div>
        {page && (
          <Pagination
            currentPage={currentPage}
            totalPages={page.totalPages}
            totalItems={page.total}
            pageSize={page.limit}
            onPageChange={setCurrentPage}
            isLoading={loading}
          />
        )}
      </main>
    </>
  );
}
