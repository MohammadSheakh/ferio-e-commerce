"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Topbar from "@/components/Topbar";
import FindingsQueue from "@/components/reconciliation/FindingsQueue";
import SettlementImportPanel from "@/components/reconciliation/SettlementImportPanel";
import { formatTaka } from "@/lib/catalog";
import type { CourierCode } from "@/lib/shipping";
import type {
  CourierSettlement,
  EligibleCodCollection,
} from "@/lib/settlements";

export default function ReconciliationPage() {
  const [eligible, setEligible] = useState<EligibleCodCollection[]>([]);
  const [settlements, setSettlements] = useState<CourierSettlement[]>([]);
  const [provider, setProvider] = useState<CourierCode>("STEADFAST");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [eligibleResponse, settlementsResponse] = await Promise.all([
        fetch("/api/settlements/eligible-collections", { cache: "no-store" }),
        fetch("/api/settlements", { cache: "no-store" }),
      ]);
      const eligiblePayload = (await eligibleResponse.json()) as {
        data?: EligibleCodCollection[];
        message?: string;
      };
      const settlementsPayload = (await settlementsResponse.json()) as {
        data?: CourierSettlement[];
        message?: string;
      };
      if (!eligibleResponse.ok || !eligiblePayload.data)
        throw new Error(
          eligiblePayload.message || "Unable to load eligible collections.",
        );
      if (!settlementsResponse.ok || !settlementsPayload.data)
        throw new Error(
          settlementsPayload.message || "Unable to load settlements.",
        );
      setEligible(eligiblePayload.data);
      setSettlements(settlementsPayload.data);
      setSelected([]);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load reconciliation.",
      );
    } finally {
      setLoading(false);
    }
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
      return setError("Select at least one delivered COD shipment.");
    setSaving(true);
    setError("");
    try {
      const items = selected.map((collectionId) => {
        const collection = eligible.find((entry) => entry.id === collectionId)!;
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
          "Idempotency-Key": crypto.randomUUID(),
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
      await load();
    } catch (recordError) {
      setError(
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
      <main className="space-y-10 p-8">
        {error && (
          <p role="alert" className="text-[12px] text-rose-700">
            {error}
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
            <select
              value={provider}
              onChange={(event) => {
                setProvider(event.target.value as CourierCode);
                setSelected([]);
              }}
              className="rounded-full border border-line px-4 py-2 text-[12px]"
            >
              <option value="STEADFAST">Steadfast</option>
              <option value="PATHAO">Pathao</option>
              <option value="REDX">REDX</option>
              <option value="ECOURIER">eCourier</option>
              <option value="PAPERFLY">Paperfly</option>
              <option value="CARRYBEE">CarryBee</option>
            </select>
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
                          className="w-28 rounded-card border border-line px-2.5 py-2 disabled:opacity-40"
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
                          className="w-24 rounded-card border border-line px-2.5 py-2 disabled:opacity-40"
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
                          className="w-24 rounded-card border border-line px-2.5 py-2 disabled:opacity-40"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          disabled={!selected.includes(entry.id)}
                          name={`note-${entry.id}`}
                          maxLength={500}
                          className="w-40 rounded-card border border-line px-2.5 py-2 disabled:opacity-40"
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
              <input
                required
                name="providerSettlementReference"
                minLength={2}
                maxLength={200}
                placeholder="Provider settlement reference"
                className="rounded-card border border-line px-3 py-2.5 text-[12px]"
              />
              <input
                required
                name="bankReference"
                minLength={2}
                maxLength={200}
                placeholder="Bank transaction reference"
                className="rounded-card border border-line px-3 py-2.5 text-[12px]"
              />
              <label className="text-[10px] text-ink2">
                Remitted amount
                <input
                  required
                  name="remittedAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1 w-full rounded-card border border-line px-3 py-2 text-[12px]"
                />
              </label>
              <label className="text-[10px] text-ink2">
                Settled at
                <input
                  required
                  name="settledAt"
                  type="datetime-local"
                  className="mt-1 w-full rounded-card border border-line px-3 py-2 text-[12px]"
                />
              </label>
              <input
                name="note"
                maxLength={1000}
                placeholder="Optional batch note"
                className="rounded-card border border-line px-3 py-2.5 text-[12px]"
              />
            </div>
            <button
              disabled={saving || selected.length === 0}
              className="mt-4 rounded-full bg-ink px-5 py-2.5 text-[12px] text-white disabled:opacity-40"
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
                      {entry.status.toLowerCase()}
                    </span>
                    <p className="mt-2 text-[11px] text-ink2">
                      Remitted {formatTaka(entry.remittedAmount)} · variance{" "}
                      {formatTaka(entry.variance)}
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
            {loading && (
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
