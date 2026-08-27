"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Pagination from "@/components/Pagination";
import Topbar from "@/components/Topbar";
import type { WarrantyClaim, WarrantyClaimPage } from "@/lib/warranty";
import {
  formatWarrantyStatus,
  warrantyStatusClass,
  warrantyTransitions,
} from "@/lib/warranty";

const fieldClass =
  "rounded-card border border-line bg-paper px-3 py-2.5 text-[12px] text-ink focus-visible:border-ink focus-visible:outline-none";

const statusOptions = Object.keys(warrantyTransitions) as Array<
  keyof typeof warrantyTransitions
>;

function TransitionForm({
  claim,
  reload,
  announce,
}: {
  claim: WarrantyClaim;
  reload: () => Promise<void>;
  announce: (message: string) => void;
}) {
  const options = warrantyTransitions[claim.status];
  const [nextStatus, setNextStatus] = useState(options[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!nextStatus) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/warranty/${claim.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          note: String(form.get("note") || "") || undefined,
          rejectionReason:
            nextStatus === "REJECTED"
              ? String(form.get("rejectionReason") || "") || undefined
              : undefined,
        }),
      });
      const payload = (await response.json()) as {
        data?: WarrantyClaim;
        message?: string;
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.message || "Unable to update warranty claim.");
      announce(
        `${claim.reference} moved to ${formatWarrantyStatus(nextStatus)}.`,
      );
      await reload();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update warranty claim.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 border-t border-line pt-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-[10px] text-ink2">
          Next status
          <select
            value={nextStatus}
            onChange={(event) =>
              setNextStatus(event.target.value as typeof nextStatus)
            }
            className={`mt-1 w-full ${fieldClass}`}
          >
            {options.map((status) => (
              <option key={status} value={status}>
                {formatWarrantyStatus(status)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px] text-ink2 xl:col-span-2">
          Operational note
          <input
            name="note"
            maxLength={1000}
            placeholder="Optional handling context"
            className={`mt-1 w-full ${fieldClass}`}
          />
        </label>
        {nextStatus === "REJECTED" && (
          <label className="text-[10px] text-ink2">
            Rejection reason
            <input
              required
              name="rejectionReason"
              maxLength={1000}
              className={`mt-1 w-full ${fieldClass}`}
            />
          </label>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          disabled={saving}
          className="rounded-full bg-ink px-5 py-2.5 text-[12px] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-40"
        >
          {saving ? "Updating…" : "Update claim"}
        </button>
        <p className="text-[11px] text-ink2">
          Status changes are retained in the claim history.
        </p>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-[11px] text-rose-700">
          {error}
        </p>
      )}
    </form>
  );
}

export default function WarrantyPage() {
  const [page, setPage] = useState<WarrantyClaimPage | null>(null);
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
      });
      if (status) query.set("status", status);
      if (search) query.set("search", search);
      const response = await fetch(`/api/warranty?${query}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: WarrantyClaimPage;
        message?: string;
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.message || "Unable to load warranty claims.");
      setPage(payload.data);
      if (
        payload.data.totalPages > 0 &&
        currentPage > payload.data.totalPages
      ) {
        setCurrentPage(payload.data.totalPages);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load warranty claims.",
      );
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCurrentPage(1);
    setSearch(searchInput.normalize("NFKC").trim());
  }

  const claims = page?.items ?? [];

  return (
    <>
      <Topbar
        title="Warranty"
        subtitle={`${page?.total ?? 0} customer claims in this view`}
      />
      <main className="p-4 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <form
            onSubmit={applySearch}
            className="flex min-w-0 flex-1 flex-wrap items-end gap-2"
          >
            <label className="min-w-64 flex-1 text-[10px] text-ink2">
              Search claims
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Claim, order, customer, product, SKU or phone"
                className={`mt-1 w-full ${fieldClass}`}
              />
            </label>
            <button className="rounded-full border border-line px-4 py-2.5 text-[12px] text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
              Search
            </button>
            {(search || searchInput) && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setCurrentPage(1);
                }}
                className="rounded-full px-3 py-2.5 text-[12px] text-ink2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Clear
              </button>
            )}
          </form>
          <label className="text-[10px] text-ink2">
            Claim status
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setCurrentPage(1);
              }}
              className={`mt-1 block rounded-full ${fieldClass}`}
            >
              <option value="">All statuses</option>
              {statusOptions.map((value) => (
                <option key={value} value={value}>
                  {formatWarrantyStatus(value)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-full border border-rose-200 px-3 py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
            >
              Retry
            </button>
          </div>
        )}
        {notice && (
          <p role="status" className="mt-5 text-[12px] text-emerald-700">
            {notice}
          </p>
        )}

        <div className="mt-6 divide-y divide-line border-y border-line">
          {claims.map((claim) => (
            <article key={claim.id} className="py-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[15px] font-medium text-ink">
                      {claim.reference} · {claim.productNameSnapshot}
                    </h2>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] ${warrantyStatusClass(claim.status)}`}
                    >
                      {formatWarrantyStatus(claim.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-ink2">
                    {claim.variantNameSnapshot} · {claim.skuSnapshot} · order{" "}
                    {claim.orderReferenceSnapshot}
                  </p>
                </div>
                <p className="text-[10px] text-ink2">
                  Submitted {new Date(claim.createdAt).toLocaleString("en-BD")}
                </p>
              </div>

              <div className="mt-4 grid gap-x-6 gap-y-2 border-y border-line py-3 text-[11px] sm:grid-cols-2 xl:grid-cols-4">
                <p>
                  <span className="text-ink2">Order customer</span>
                  <br />
                  <span className="text-ink">
                    {claim.orderItem.order.customer.name}
                  </span>
                </p>
                <p>
                  <span className="text-ink2">Checkout phone</span>
                  <br />
                  <span className="text-ink">
                    {claim.orderItem.order.customer.phoneNormalized}
                  </span>
                </p>
                <p>
                  <span className="text-ink2">Account</span>
                  <br />
                  <span className="text-ink">{claim.submittedBy.name}</span>
                </p>
                <p>
                  <span className="text-ink2">Account email</span>
                  <br />
                  <span className="text-ink">{claim.submittedBy.email}</span>
                </p>
              </div>

              <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div>
                  <h3 className="text-[10px] uppercase tracking-eyebrow text-ink2">
                    Reported issue
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-ink">
                    {claim.issueDescription}
                  </p>
                  {claim.rejectionReason && (
                    <p className="mt-3 rounded-card bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
                      Rejection reason: {claim.rejectionReason}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-3">
                    {claim.evidence.map((evidence, index) => (
                      <a
                        key={evidence.id}
                        href={evidence.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block h-28 w-28 overflow-hidden rounded-card bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                      >
                        <img
                          src={evidence.imageUrl}
                          alt={`${claim.productNameSnapshot} warranty evidence ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] uppercase tracking-eyebrow text-ink2">
                    Status history
                  </h3>
                  <ol className="mt-2 divide-y divide-line border-y border-line">
                    {claim.history.map((entry) => (
                      <li key={entry.id} className="py-3 text-[11px]">
                        <div className="flex justify-between gap-3">
                          <p className="font-medium text-ink">
                            {formatWarrantyStatus(entry.newStatus)}
                          </p>
                          <p className="text-[10px] text-ink2">
                            {new Date(entry.createdAt).toLocaleString("en-BD")}
                          </p>
                        </div>
                        <p className="mt-1 text-[10px] text-ink2">
                          {entry.source.toLowerCase()} · actor {entry.actorId}
                        </p>
                        {entry.note && (
                          <p className="mt-1 leading-4 text-ink2">
                            {entry.note}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <TransitionForm
                key={`${claim.id}-${claim.status}`}
                claim={claim}
                reload={load}
                announce={setNotice}
              />
            </article>
          ))}
          {loading && claims.length === 0 && (
            <p className="py-16 text-center text-[13px] text-ink2">
              Loading warranty claims…
            </p>
          )}
          {!loading && claims.length === 0 && (
            <p className="py-16 text-center text-[13px] text-ink2">
              No warranty claims match this view.
            </p>
          )}
        </div>

        {page && (
          <Pagination
            currentPage={page.page}
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
