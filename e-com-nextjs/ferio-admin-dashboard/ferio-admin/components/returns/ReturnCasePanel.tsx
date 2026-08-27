"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { OrderDetail } from "@/lib/orders";
import type { ReturnCase, ReturnEligibility } from "@/lib/returns";
import { returnStatusClass } from "@/lib/returns";

function formatEnum(value: string) {
  const label = value.replaceAll("_", " ").toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function ReturnCasePanel({
  order,
  onChanged,
}: {
  order: OrderDetail;
  onChanged?: () => void | Promise<void>;
}) {
  const [eligibility, setEligibility] = useState<ReturnEligibility | null>(
    null,
  );
  const [cases, setCases] = useState<ReturnCase[]>([]);
  const [itemId, setItemId] = useState(order.items[0]?.id ?? "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [eligibilityResponse, casesResponse] = await Promise.all([
        fetch(`/api/orders/${order.id}/returns/eligibility`, {
          cache: "no-store",
        }),
        fetch(`/api/orders/${order.id}/returns`, { cache: "no-store" }),
      ]);
      const eligibilityPayload = (await eligibilityResponse.json()) as {
        data?: ReturnEligibility;
        message?: string;
      };
      const casesPayload = (await casesResponse.json()) as {
        data?: ReturnCase[];
        message?: string;
      };
      if (!eligibilityResponse.ok || !eligibilityPayload.data)
        throw new Error(
          eligibilityPayload.message ||
            "Unable to evaluate return eligibility.",
        );
      if (!casesResponse.ok || !casesPayload.data)
        throw new Error(casesPayload.message || "Unable to load return cases.");
      setEligibility(eligibilityPayload.data);
      setCases(casesPayload.data);
      const available = eligibilityPayload.data.items.find(
        (item) => item.remainingQuantity > 0,
      );
      if (available) setItemId(available.orderItemId);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load returns.",
      );
    } finally {
      setLoading(false);
    }
  }, [order.id]);

  useEffect(() => {
    void load();
  }, [load]);
  const selectedItem = eligibility?.items.find(
    (item) => item.orderItemId === itemId,
  );

  async function createCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    setError("");
    try {
      const evidenceUrls = String(form.get("evidenceUrls") || "")
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean);
      const response = await fetch(`/api/orders/${order.id}/returns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: form.get("reason"),
          description: form.get("description"),
          requestedResolution: form.get("requestedResolution"),
          requestChannel: form.get("requestChannel"),
          items: [
            { orderItemId: itemId, quantity: Number(form.get("quantity")) },
          ],
          evidenceUrls,
        }),
      });
      const payload = (await response.json()) as {
        data?: ReturnCase;
        message?: string;
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.message || "Unable to create return case.");
      formElement.reset();
      await load();
      await onChanged?.();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to create return case.",
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-card border border-line bg-paper px-3 py-2.5 text-[13px] text-ink focus-visible:border-ink focus-visible:outline-none";
  const availableItems =
    eligibility?.items.filter((item) => item.remainingQuantity > 0) ?? [];

  return (
    <section className="rounded-card border border-line p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-medium text-ink">Return cases</h2>
          <p className="mt-1 text-[12px] text-ink2">
            Eligibility is advisory. Approval always requires staff review.
          </p>
        </div>
        <Link
          href="/dashboard/returns"
          className="text-[12px] text-ink2 underline decoration-line underline-offset-4"
        >
          Review queue
        </Link>
      </div>
      {eligibility && (
        <div className="mt-5 border-y border-line py-4">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] ${eligibility.status === "ELIGIBLE" ? "bg-emerald-50 text-emerald-700" : eligibility.status === "INELIGIBLE" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}
            >
              {formatEnum(eligibility.status)}
            </span>
            <span className="text-[12px] text-ink2">
              {eligibility.reasons.join(" · ")}
            </span>
          </div>
        </div>
      )}
      {cases.length > 0 && (
        <div className="mt-4 divide-y divide-line">
          {cases.map((entry) => (
            <div key={entry.id} className="py-4">
              <div className="flex justify-between gap-3">
                <span className="text-[13px] text-ink">
                  {entry.rmaReference}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] ${returnStatusClass(entry.status)}`}
                >
                  {formatEnum(entry.status)}
                </span>
              </div>
              <p className="mt-2 text-[12px] text-ink2">
                {formatEnum(entry.reason)} ·{" "}
                {formatEnum(entry.requestedResolution).toLowerCase()}
              </p>
              {entry.items.map((item) => (
                <p key={item.id} className="mt-1 text-[12px] text-ink2">
                  {item.orderItem.productName} · {item.orderItem.variantName} ×{" "}
                  {item.requestedQuantity}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
      {availableItems.length > 0 && (
        <form onSubmit={createCase} className="mt-5 border-t border-line pt-5">
          <h3 className="text-[13px] font-medium text-ink">
            Record return request
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-[11px] text-ink2">
              Item
              <select
                required
                value={itemId}
                onChange={(event) => setItemId(event.target.value)}
                className={inputClass}
              >
                {availableItems.map((item) => (
                  <option key={item.orderItemId} value={item.orderItemId}>
                    {item.productName} · {item.variantName} (
                    {item.remainingQuantity} left)
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] text-ink2">
              Quantity
              <input
                required
                name="quantity"
                type="number"
                min="1"
                max={selectedItem?.remainingQuantity ?? 1}
                defaultValue="1"
                className={inputClass}
              />
            </label>
            <label className="text-[11px] text-ink2">
              Reason
              <select name="reason" className={inputClass}>
                <option value="DAMAGED">Damaged</option>
                <option value="DEFECTIVE">Defective</option>
                <option value="WRONG_ITEM">Wrong item</option>
                <option value="NOT_AS_DESCRIBED">Not as described</option>
                <option value="SIZE_OR_FIT">Size or fit</option>
                <option value="CHANGED_MIND">Changed mind</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label className="text-[11px] text-ink2">
              Requested outcome
              <select name="requestedResolution" className={inputClass}>
                <option value="REFUND">Refund</option>
                <option value="REPLACEMENT">Replacement</option>
                <option value="EXCHANGE">Exchange</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label className="text-[11px] text-ink2">
              Channel
              <select name="requestChannel" className={inputClass}>
                <option value="SUPPORT">Support</option>
                <option value="ADMIN">Admin</option>
                <option value="CUSTOMER">Customer</option>
              </select>
            </label>
          </div>
          <textarea
            required
            name="description"
            minLength={3}
            maxLength={1000}
            rows={3}
            placeholder="Reason and relevant details"
            className={`${inputClass} mt-3`}
          />
          <textarea
            name="evidenceUrls"
            rows={2}
            placeholder="Evidence URLs, one per line"
            className={`${inputClass} mt-3`}
          />
          <button
            disabled={saving}
            className="mt-3 rounded-full bg-ink px-5 py-2.5 text-[13px] text-white disabled:opacity-40"
          >
            {saving ? "Recording…" : "Record request"}
          </button>
        </form>
      )}
      {error && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-rose-200 bg-rose-50 p-4 text-[12px] text-rose-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-full border border-rose-200 px-3 py-1.5 font-medium"
          >
            Retry return data
          </button>
        </div>
      )}
      {loading && !eligibility && (
        <p className="mt-4 text-[12px] text-ink2">Loading return data…</p>
      )}
    </section>
  );
}
