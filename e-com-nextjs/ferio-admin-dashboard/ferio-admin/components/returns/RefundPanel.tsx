"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type {
  CommerceRefund,
  RefundEligibility,
  ReturnCase,
} from "@/lib/returns";

const money = (amount: number, currency: string) =>
  `${currency} ${(amount / 100).toLocaleString("en-BD", { minimumFractionDigits: 2 })}`;

function ResultForm({
  refund,
  reload,
}: {
  refund: CommerceRefund;
  reload: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/refunds/${refund.id}/result`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          executionMode: form.get("executionMode"),
          outcome: form.get("outcome"),
          provider: String(form.get("provider") || "") || undefined,
          externalReference:
            String(form.get("externalReference") || "") || undefined,
          failureReason: String(form.get("failureReason") || "") || undefined,
        }),
      });
      const payload = (await response.json()) as {
        data?: CommerceRefund;
        message?: string;
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.message || "Unable to record result.");
      reload();
    } catch (resultError) {
      setError(
        resultError instanceof Error
          ? resultError.message
          : "Unable to record result.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="mt-3 grid gap-2 border-t border-line pt-3 md:grid-cols-2 xl:grid-cols-5"
    >
      <select
        name="executionMode"
        className="rounded-card border border-line px-3 py-2 text-[11px]"
      >
        <option value="MANUAL">Manual settlement</option>
        <option value="PROVIDER">Provider result</option>
      </select>
      <select
        name="outcome"
        className="rounded-card border border-line px-3 py-2 text-[11px]"
      >
        <option value="SUCCEEDED">Succeeded</option>
        <option value="FAILED">Failed</option>
      </select>
      <input
        name="provider"
        placeholder="Provider (required for provider)"
        className="rounded-card border border-line px-3 py-2 text-[11px]"
      />
      <input
        name="externalReference"
        placeholder="Receipt/reference (required on success)"
        className="rounded-card border border-line px-3 py-2 text-[11px]"
      />
      <input
        name="failureReason"
        placeholder="Failure reason (required on failure)"
        className="rounded-card border border-line px-3 py-2 text-[11px]"
      />
      <div className="md:col-span-2 xl:col-span-5">
        <button
          disabled={saving}
          className="rounded-full bg-ink px-4 py-2 text-[11px] text-white disabled:opacity-40"
        >
          {saving ? "Recording…" : "Record external result"}
        </button>
        {error && (
          <p role="alert" className="mt-2 text-[11px] text-rose-700">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}

export default function RefundPanel({
  entry,
  reloadReturns,
}: {
  entry: ReturnCase;
  reloadReturns: () => void;
}) {
  const [eligibility, setEligibility] = useState<RefundEligibility | null>(
    null,
  );
  const [refunds, setRefunds] = useState<CommerceRefund[]>(entry.refunds ?? []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [eligibilityResponse, refundsResponse] = await Promise.all([
        fetch(`/api/returns/${entry.id}/refund-eligibility`, {
          cache: "no-store",
        }),
        fetch(`/api/returns/${entry.id}/refunds`, { cache: "no-store" }),
      ]);
      const eligibilityPayload = (await eligibilityResponse.json()) as {
        data?: RefundEligibility;
        message?: string;
      };
      const refundsPayload = (await refundsResponse.json()) as {
        data?: CommerceRefund[];
        message?: string;
      };
      if (!eligibilityResponse.ok || !eligibilityPayload.data)
        throw new Error(
          eligibilityPayload.message || "Unable to load refund eligibility.",
        );
      if (!refundsResponse.ok || !refundsPayload.data)
        throw new Error(refundsPayload.message || "Unable to load refunds.");
      setEligibility(eligibilityPayload.data);
      setRefunds(refundsPayload.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load refunds.",
      );
    } finally {
      setLoading(false);
    }
  }, [entry.id]);
  useEffect(() => {
    void load();
  }, [load]);
  async function createRefund(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/returns/${entry.id}/refunds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          amount: Math.round(Number(form.get("amount")) * 100),
          method: form.get("method"),
          reason: form.get("reason"),
          sourcePaymentReference:
            String(form.get("sourcePaymentReference") || "") || undefined,
        }),
      });
      const payload = (await response.json()) as {
        data?: CommerceRefund;
        message?: string;
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.message || "Unable to create refund.");
      await load();
      reloadReturns();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create refund.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="mt-5 border-t border-line pt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium text-ink">Refund ledger</p>
          <p className="mt-1 max-w-2xl text-[11px] leading-5 text-ink2">
            Create a bounded refund instruction, then record the actual provider
            or manual settlement result. Creating an instruction does not move
            money.
          </p>
        </div>
        {eligibility && (
          <div className="text-right text-[11px] text-ink2">
            <p>
              Refundable{" "}
              {money(eligibility.maximumRefundable, eligibility.currency)}
            </p>
            <p>
              Remaining{" "}
              {money(eligibility.remainingAmount, eligibility.currency)}
            </p>
          </div>
        )}
      </div>
      {loading && (
        <p className="mt-3 text-[11px] text-ink2">Loading refund ledger…</p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-[11px] text-rose-700">
          {error}
        </p>
      )}
      {eligibility && eligibility.remainingAmount > 0 && (
        <form
          onSubmit={createRefund}
          className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4"
        >
          <label className="text-[11px] text-ink2">
            Amount ({eligibility.currency})
            <input
              required
              name="amount"
              type="number"
              min="0.01"
              max={eligibility.remainingAmount / 100}
              step="0.01"
              defaultValue={(eligibility.remainingAmount / 100).toFixed(2)}
              className="mt-1 w-full rounded-card border border-line px-3 py-2 text-[12px]"
            />
          </label>
          <label className="text-[11px] text-ink2">
            Method
            <select
              name="method"
              className="mt-1 w-full rounded-card border border-line px-3 py-2 text-[12px]"
            >
              <option value="BANK_TRANSFER">Bank transfer</option>
              <option value="BKASH">bKash</option>
              <option value="NAGAD">Nagad</option>
              <option value="ROCKET">Rocket</option>
              <option value="CASH">Cash</option>
              <option value="OTHER">Other</option>
              {eligibility.paymentMethod !== "COD" && (
                <option value="ORIGINAL_PAYMENT">Original payment</option>
              )}
            </select>
          </label>
          <label className="text-[11px] text-ink2">
            Source payment reference
            <input
              name="sourcePaymentReference"
              placeholder="Required for original payment"
              className="mt-1 w-full rounded-card border border-line px-3 py-2 text-[12px]"
            />
          </label>
          <label className="text-[11px] text-ink2">
            Reason
            <input
              required
              name="reason"
              minLength={3}
              maxLength={1000}
              defaultValue={`Accepted return ${entry.rmaReference}`}
              className="mt-1 w-full rounded-card border border-line px-3 py-2 text-[12px]"
            />
          </label>
          <div className="md:col-span-2 xl:col-span-4">
            <button
              disabled={saving}
              className="rounded-full bg-ink px-4 py-2 text-[11px] text-white disabled:opacity-40"
            >
              {saving ? "Creating…" : "Create refund instruction"}
            </button>
          </div>
        </form>
      )}
      <div className="mt-4 space-y-3">
        {refunds.map((refund) => (
          <article
            key={refund.id}
            className="rounded-card border border-line p-4"
          >
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="text-[12px] font-medium text-ink">
                  {refund.reference} · {money(refund.amount, refund.currency)}
                </p>
                <p className="mt-1 text-[11px] text-ink2">
                  {refund.method.replaceAll("_", " ").toLowerCase()} ·{" "}
                  {refund.reason}
                </p>
              </div>
              <span
                className={`h-fit rounded-full px-2.5 py-1 text-[10px] ${refund.status === "SUCCEEDED" ? "bg-emerald-50 text-emerald-700" : refund.status === "FAILED" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}
              >
                {refund.status.toLowerCase()}
              </span>
            </div>
            {refund.attempts.length > 0 && (
              <div className="mt-3 space-y-1 text-[10px] text-ink2">
                {refund.attempts.map((attempt) => (
                  <p key={attempt.id}>
                    Attempt {attempt.attemptNumber}:{" "}
                    {attempt.outcome.toLowerCase()} via{" "}
                    {attempt.executionMode.toLowerCase()}
                    {attempt.externalReference
                      ? ` · ${attempt.externalReference}`
                      : ""}
                    {attempt.failureReason ? ` · ${attempt.failureReason}` : ""}
                  </p>
                ))}
              </div>
            )}
            {!["SUCCEEDED", "CANCELLED"].includes(refund.status) && (
              <ResultForm refund={refund} reload={() => void load()} />
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
