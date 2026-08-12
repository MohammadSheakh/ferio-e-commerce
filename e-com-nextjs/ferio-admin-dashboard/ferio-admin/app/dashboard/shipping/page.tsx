"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import RtoQueue from "@/components/shipping/RtoQueue";
import { formatTaka } from "@/lib/catalog";
import type { Shipment, ShipmentProvider } from "@/lib/shipping";
import { shipmentStatusClass } from "@/lib/shipping";

export default function ShippingPage() {
  const [providers, setProviders] = useState<ShipmentProvider[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [providerResponse, shipmentResponse] = await Promise.all([
        fetch("/api/shipping/providers", { cache: "no-store" }),
        fetch("/api/shipping/shipments", { cache: "no-store" }),
      ]);
      const providerPayload = (await providerResponse.json()) as {
        data?: ShipmentProvider[];
        message?: string;
      };
      const shipmentPayload = (await shipmentResponse.json()) as {
        data?: Shipment[];
        message?: string;
      };
      if (!providerResponse.ok || !providerPayload.data) {
        throw new Error(providerPayload.message || "Unable to load providers.");
      }
      if (!shipmentResponse.ok || !shipmentPayload.data) {
        throw new Error(shipmentPayload.message || "Unable to load shipments.");
      }
      setProviders(providerPayload.data);
      setShipments(shipmentPayload.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load shipping.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleProvider(provider: ShipmentProvider) {
    setError("");
    try {
      const response = await fetch(`/api/shipping/providers/${provider.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !provider.isActive }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(payload.message || "Unable to update provider.");
      await load();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update provider.",
      );
    }
  }

  return (
    <>
      <Topbar
        title="Shipping"
        subtitle={`${shipments.length} shipment records`}
      />
      <div className="space-y-9 p-8">
        <section>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[16px] font-medium text-ink">
                Courier providers
              </h2>
              <p className="mt-1 text-[12px] text-ink2">
                Credentials stay in environment secrets. Activation is blocked
                until configuration is complete.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {providers.map((provider) => (
              <div
                key={provider.code}
                className="rounded-card border border-line p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[14px] font-medium text-ink">
                      {provider.name}
                    </p>
                    <p className="mt-1 text-[11px] text-ink2">
                      {provider.code} ·{" "}
                      {provider.configured
                        ? "Credentials configured"
                        : "Credentials missing"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] ${provider.isActive ? "bg-emerald-50 text-emerald-700" : provider.configured ? "bg-surface text-ink2" : "bg-amber-50 text-amber-700"}`}
                  >
                    {provider.isActive
                      ? "Active"
                      : provider.configured
                        ? "Inactive"
                        : "Not ready"}
                  </span>
                </div>
                <button
                  disabled={!provider.configured}
                  onClick={() => void toggleProvider(provider)}
                  className="mt-5 rounded-full border border-line px-4 py-2 text-[12px] text-ink disabled:opacity-40"
                >
                  {provider.isActive ? "Disable" : "Enable"}
                </button>
              </div>
            ))}
          </div>
        </section>

        {error && (
          <p role="alert" className="text-[13px] text-rose-700">
            {error}
          </p>
        )}
        <section>
          <h2 className="text-[16px] font-medium text-ink">Shipment queue</h2>
          <div className="mt-5 overflow-x-auto rounded-card border border-line">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-eyebrow text-ink2">
                  <th className="px-5 py-3 font-normal">Order</th>
                  <th className="px-5 py-3 font-normal">Customer</th>
                  <th className="px-5 py-3 font-normal">Courier</th>
                  <th className="px-5 py-3 font-normal">Tracking</th>
                  <th className="px-5 py-3 font-normal">COD</th>
                  <th className="px-5 py-3 font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shipments.map((shipment) => (
                  <tr key={shipment.id} className="text-[13px]">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/dashboard/orders/${shipment.order?.id}`}
                        className="font-medium text-ink hover:underline"
                      >
                        {shipment.order?.reference}
                      </Link>
                      <p className="text-[11px] text-ink2">
                        {shipment.order?.address
                          ? `${shipment.order.address.area}, ${shipment.order.address.district}`
                          : "—"}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-ink">
                        {shipment.order?.customer.name}
                      </p>
                      <p className="text-[11px] text-ink2">
                        {shipment.order?.customer.phoneNormalized}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-ink2">
                      {shipment.provider.name}
                    </td>
                    <td className="px-5 py-3.5 text-ink2">
                      {shipment.trackingNumber || "Pending"}
                    </td>
                    <td className="px-5 py-3.5 text-ink">
                      {formatTaka(shipment.codAmount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] ${shipmentStatusClass(shipment.status)}`}
                      >
                        {shipment.status.replaceAll("_", " ").toLowerCase()}
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && shipments.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-14 text-center text-[13px] text-ink2"
                    >
                      No courier shipments have been created.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-14 text-center text-[13px] text-ink2"
                    >
                      Loading shipments…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <RtoQueue />
      </div>
    </>
  );
}
