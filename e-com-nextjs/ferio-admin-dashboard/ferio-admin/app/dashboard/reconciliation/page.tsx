"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Topbar from "@/components/Topbar";
import FindingsQueue from "@/components/reconciliation/FindingsQueue";
import SettlementImportPanel from "@/components/reconciliation/SettlementImportPanel";
import { createBrowserUuid } from "@/lib/browser-uuid";
import { formatTaka } from "@/lib/catalog";
import type { CourierCode } from "@/lib/shipping";
import type {
  CourierSettlement,
  EligibleCodCollection,
} from "@/lib/settlements";

const fieldClass =
  "rounded-card border border-line bg-paper px-3 py-2.5 text-[12px] text-ink focus-visible:border-ink focus-visible:outline-none";

function formatEnum(value: string) {
  const label = value.replaceAll("_", " ").toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function failureMessage(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason.message : fallback;
}

export default function ReconciliationPage() {
  const [eligible, setEligible] = useState<EligibleCodCollection[]>([]);
  const [settlements, setSettlements] = useState<CourierSettlement[]>([]);
  const [provider, setProvider] = useState<CourierCode>("STEADFAST");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [operationError, setOperationError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const [eligibleResult, settlementsResult] = await Promise.allSettled([
      (async () => {
        const response = await fetch("/api/settlements/eligible-collections", {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          data?: EligibleCodCollection[];
          message?: string;
        };
        if (!response.ok || !payload.data)
          throw new Error(
            payload.message || "Unable to load eligible collections.",
          );
        return payload.data;
      })(),
      (async () => {
        const response = await fetch("/api/settlements", {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          data?: CourierSettlement[];
          message?: string;
        };
        if (!response.ok || !payload.data)
          throw new Error(payload.message || "Unable to load settlements.");
        return payload.data;
      })(),
    ]);
    const failures: string[] = [];
    if (eligibleResult.status === "fulfilled") {
      setEligible(eligibleResult.value);
      setSelected([]);
    } else {
      failures.push(
        failureMessage(
          eligibleResult.reason,
          "Unable to load eligible collections.",
        ),
      );
    }
    if (settlementsResult.status === "fulfilled") {
      setSettlements(settlementsResult.value);
    } else {
      failures.push(
        failureMessage(settlementsResult.reason, "Unable to load settlements."),
      );
    }
    setLoadError(failures.join(" "));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  const providerCollections = useMemo(
    () => eligible.filter((entry) => entry.shipment.provider.code === provider),
    [eligible, provider],
  );

  async function record(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (selected.length === 0)
      return setOperationError("Select at least one delivered COD shipment.");
    setSaving(true);
    setOperationError("");
    setNotice("");
    try {
      const items = selected.map((collectionId) => {
        const collection = eligible.find((entry) => entry.id === collectionId);
        if (!collection)
          throw new Error(
            "A selected COD collection is no longer available. Reload and try again.",
          );
        return {
          shipmentId: collection.shipment.id,
          collectedAmount: Math.round(
            Number(form.get(`collected-${collectionId}`)) * 100,
          ),
          courierFee: Math.round(Number(form.get(`fee-${collectionId}`)) * 100),
          otherDeduction: Math.round(
            Number(form.get(`deduction-${collectionId}`)) * 100,
          ),
          note: String(form.get(`note-${collectionId}`) || "") || undefined,
        };
      });
      const response = await fetch("/api/settlements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": createBrowserUuid(),
        },
        body: JSON.stringify({
          provider,
          providerSettlementReference: form.get("providerSettlementReference"),
          bankReference: form.get("bankReference"),
          remittedAmount: Math.round(Number(form.get("remittedAmount")) * 100),
          settledAt: new Date(String(form.get("settledAt"))).toISOString(),
          note: String(form.get("note") || "") || undefined,
          items,
        }),
      });
      const payload = (await response.json()) as {
        data?: CourierSettlement;
        message?: string;
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.message || "Unable to record settlement.");
      setNotice(`Settlement ${payload.data.reference} recorded.`);
      await load();
    } catch (recordError) {
      setOperationError(
        recordError instanceof Error
          ? recordError.message
          : "Unable to record settlement.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Topbar
        title="Reconciliation"
        subtitle="COD expected, collected, fees, remittance, and variance"
      />
      <main className="space-y-10 p-4 sm:p-8">
        {loadError && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 border-y border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700"
          >
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-full border border-rose-200 px-3 py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
            >
              Retry settlement data
            </button>
          </div>
        )}
        {operationError && (
          <p role="alert" className="text-[12px] text-rose-700">
            {operationError}
          </p>
        )}
        {notice && (
          <p role="status" className="text-[12px] text-emerald-700">
            {notice}
          </p>
        )}
        <FindingsQueue />
        <SettlementImportPanel onApplied={load} />
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-medium text-ink">
                Record courier settlement
              </h2>
              <p className="mt-1 max-w-3xl text-[12px] leading-5 text-ink2">
                Use the courier report and bank transaction. Delivered COD
                creates an expectation; this command records what was actually
                collected and remitted.
              </p>
            </div>
            <label className="text-[10px] text-ink2">
              Courier provider
              <select
                value={provider}
                onChange={(event) => {
                  setProvider(event.target.value as CourierCode);
                  setSelected([]);
                }}
                className={`mt-1 block rounded-full ${fieldClass}`}
              >
                <option value="STEADFAST">Steadfast</option>
                <option value="PATHAO">Pathao</option>
                <option value="REDX">REDX</option>
                <option value="ECOURIER">eCourier</option>
                <option value="PAPERFLY">Paperfly</option>
                <option value="CARRYBEE">CarryBee</option>
              </select>
            </label>
          </div>
          <form onSubmit={record} className="mt-5">
            <div className="overflow-x-auto border-y border-line">
              <table className="w-full min-w-[980px] text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-eyebrow text-ink2">
                    <th className="px-3 py-3 font-normal">Use</th>
                    <th className="px-3 py-3 font-normal">Order</th>
                    <th className="px-3 py-3 font-normal">Expected COD</th>
                    <th className="px-3 py-3 font-normal">Collected</th>
                    <th className="px-3 py-3 font-normal">Courier fee</th>
                    <th className="px-3 py-3 font-normal">Other deduction</th>
                    <th className="px-3 py-3 font-normal">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {providerCollections.map((entry) => (
                    <tr key={entry.id} className="text-[11px]">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Select ${entry.order.reference}`}
                          checked={selected.includes(entry.id)}
                          onChange={(event) =>
                            setSelected((current) =>
                              event.target.checked
                                ? [...current, entry.id]
                                : current.filter((id) => id !== entry.id),
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-3 text-ink">
                        <p>{entry.order.reference}</p>
                        <p className="text-[10px] text-ink2">
                          {entry.order.customer.name} ·{" "}
                          {entry.shipment.trackingNumber || "no tracking"}
                        </p>
                      </td>
                      <td className="px-3 py-3 font-medium text-ink">
                        {formatTaka(entry.expectedAmount)}
                      </td>
                      <td className="px-3 py-3">
                        <input
                          required={selected.includes(entry.id)}
                          disabled={!selected.includes(entry.id)}
                          name={`collected-${entry.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={(entry.expectedAmount / 100).toFixed(2)}
                          aria-label={`Collected amount for ${entry.order.reference}`}
                          className={`w-28 ${fieldClass} disabled:opacity-40`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          required={selected.includes(entry.id)}
                          disabled={!selected.includes(entry.id)}
                          name={`fee-${entry.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={(
                            (entry.shipment.shippingCharge ?? 0) / 100
                          ).toFixed(2)}
                          aria-label={`Courier fee for ${entry.order.reference}`}
                          className={`w-24 ${fieldClass} disabled:opacity-40`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          required={selected.includes(entry.id)}
                          disabled={!selected.includes(entry.id)}
                          name={`deduction-${entry.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue="0.00"
                          aria-label={`Other deduction for ${entry.order.reference}`}
                          className={`w-24 ${fieldClass} disabled:opacity-40`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          disabled={!selected.includes(entry.id)}
                          name={`note-${entry.id}`}
                          maxLength={500}
                          aria-label={`Settlement note for ${entry.order.reference}`}
                          className={`w-40 ${fieldClass} disabled:opacity-40`}
                        />
                      </td>
                    </tr>
                  ))}
                  {!loading && providerCollections.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-12 text-center text-[12px] text-ink2"
                      >
                        No eligible delivered COD collections for this provider.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <label className="text-[10px] text-ink2">
                Provider settlement reference
                <input
                  required
                  name="providerSettlementReference"
                  minLength={2}
                  maxLength={200}
                  className={`mt-1 w-full ${fieldClass}`}
                />
              </label>
              <label className="text-[10px] text-ink2">
                Bank transaction reference
                <input
                  required
                  name="bankReference"
                  minLength={2}
                  maxLength={200}
                  className={`mt-1 w-full ${fieldClass}`}
                />
              </label>
              <label className="text-[10px] text-ink2">
                Remitted amount
                <input
                  required
                  name="remittedAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  className={`mt-1 w-full ${fieldClass}`}
                />
              </label>
              <label className="text-[10px] text-ink2">
                Settled at
                <input
                  required
                  name="settledAt"
                  type="datetime-local"
                  className={`mt-1 w-full ${fieldClass}`}
                />
              </label>
              <label className="text-[10px] text-ink2">
                Batch note
                <input
                  name="note"
                  maxLength={1000}
                  placeholder="Optional"
                  className={`mt-1 w-full ${fieldClass}`}
                />
              </label>
            </div>
            <button
              disabled={saving || selected.length === 0}
              className="mt-4 rounded-full bg-ink px-5 py-2.5 text-[12px] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-40"
            >
              {saving ? "Recording…" : `Record settlement (${selected.length})`}
            </button>
          </form>
        </section>
        <section>
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-[17px] font-medium text-ink">
                Settlement history
              </h2>
              <p className="mt-1 text-[12px] text-ink2">
                Variance means provider collection or bank remittance differs
                from recorded expectations.
              </p>
            </div>
            <span className="text-[11px] uppercase tracking-eyebrow text-ink2">
              {settlements.filter((entry) => entry.status !== "MATCHED").length}{" "}
              variance
            </span>
          </div>
          <div className="mt-5 divide-y divide-line border-y border-line">
            {settlements.map((entry) => (
              <article key={entry.id} className="py-5">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-medium text-ink">
                      {entry.reference} · {entry.provider.name}
                    </p>
                    <p className="mt-1 text-[11px] text-ink2">
                      Provider {entry.providerSettlementReference} · bank{" "}
                      {entry.bankReference} · {entry.items.length} shipments
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] ${entry.status === "MATCHED" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
                    >
                      {formatEnum(entry.status)}
                    </span>
                    <p className="mt-2 text-[11px] text-ink2">
                      Remitted {formatTaka(entry.remittedAmount)} · variance{" "}
                      {formatTaka(entry.variance)}
                    </p>
                    <p className="mt-1 text-[10px] text-ink2">
                      Settled{" "}
                      {new Date(entry.settledAt).toLocaleString("en-BD")}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-[11px] text-ink2 sm:grid-cols-4">
                  <p>Collected {formatTaka(entry.grossCollected)}</p>
                  <p>Fees {formatTaka(entry.courierFees)}</p>
                  <p>Deductions {formatTaka(entry.otherDeductions)}</p>
                  <p>Expected bank {formatTaka(entry.expectedRemittance)}</p>
                </div>
              </article>
            ))}
            {loading && settlements.length === 0 && (
              <p className="py-12 text-center text-[12px] text-ink2">
                Loading reconciliation…
              </p>
            )}
            {!loading && settlements.length === 0 && (
              <p className="py-12 text-center text-[12px] text-ink2">
                No courier settlements recorded.
              </p>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
