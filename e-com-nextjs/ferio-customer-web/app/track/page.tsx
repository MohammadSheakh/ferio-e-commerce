"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { OrderTracking } from "@/lib/tracking";

function formatTaka(amount: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getOrderStages(tracking: OrderTracking) {
  const isCancelled = tracking.status === "CANCELLED";

  const findEvent = (codes: string[]) =>
    tracking.timeline.find((t) => codes.includes(t.code.toUpperCase()));

  const confirmedEvent = findEvent(["CONFIRMED"]);
  const processingEvent = findEvent([
    "READY_FOR_FULFILLMENT",
    "PICKING",
    "PACKED",
    "HANDED_OVER",
    "READY",
  ]);
  const shippedEvent = findEvent(["IN_TRANSIT", "OUT_FOR_DELIVERY"]);
  const deliveredEvent = findEvent(["DELIVERED"]);

  const isConfirmed =
    !!confirmedEvent ||
    tracking.status === "CONFIRMED" ||
    !!processingEvent ||
    !!shippedEvent ||
    !!deliveredEvent;
  const isProcessing =
    !!processingEvent ||
    !!tracking.shipment ||
    !!shippedEvent ||
    !!deliveredEvent;
  const isShipped =
    !!shippedEvent ||
    tracking.shipment?.status === "IN_TRANSIT" ||
    tracking.shipment?.status === "OUT_FOR_DELIVERY" ||
    !!deliveredEvent;
  const isDelivered =
    !!deliveredEvent ||
    tracking.status === "DELIVERED" ||
    tracking.shipment?.status === "DELIVERED";

  if (isCancelled) {
    const cancelEvent = findEvent(["CANCELLED"]);
    return [
      {
        key: "received",
        label: "Order received",
        isCompleted: true,
        isCancelled: false,
        occurredAt: tracking.createdAt,
      },
      {
        key: "cancelled",
        label: "Order cancelled",
        isCompleted: true,
        isCancelled: true,
        occurredAt: cancelEvent?.occurredAt || tracking.createdAt,
      },
      {
        key: "confirmed",
        label: "Order confirmed",
        isCompleted: false,
        isCancelled: false,
      },
      {
        key: "shipped",
        label: "Out for delivery",
        isCompleted: false,
        isCancelled: false,
      },
      {
        key: "delivered",
        label: "Delivered",
        isCompleted: false,
        isCancelled: false,
      },
    ];
  }

  return [
    {
      key: "received",
      label: "Order received",
      isCompleted: true,
      isCancelled: false,
      occurredAt: tracking.createdAt,
    },
    {
      key: "confirmed",
      label: "Order confirmed",
      isCompleted: isConfirmed,
      isCancelled: false,
      occurredAt:
        confirmedEvent?.occurredAt ||
        (isConfirmed ? tracking.createdAt : undefined),
    },
    {
      key: "processing",
      label: "Processing",
      isCompleted: isProcessing,
      isCancelled: false,
      occurredAt: processingEvent?.occurredAt,
    },
    {
      key: "shipped",
      label: "Out for delivery",
      isCompleted: isShipped,
      isCancelled: false,
      occurredAt: shippedEvent?.occurredAt,
    },
    {
      key: "delivered",
      label: "Delivered",
      isCompleted: isDelivered,
      isCancelled: false,
      occurredAt: deliveredEvent?.occurredAt,
    },
  ];
}

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const [tracking, setTracking] = useState<OrderTracking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function trackOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError("");
    setTracking(null);
    try {
      const response = await fetch("/api/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: String(form.get("reference") || ""),
          phone: String(form.get("phone") || ""),
        }),
      });
      const payload = (await response.json()) as {
        data?: OrderTracking;
        message?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.message || "Order details could not be verified.");
      }
      setTracking(payload.data);
    } catch (trackingError) {
      setError(
        trackingError instanceof Error
          ? trackingError.message
          : "Tracking is temporarily unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }

  const stages = tracking ? getOrderStages(tracking) : [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr]">
        <section>
          <p className="text-[11px] uppercase tracking-eyebrow text-ink2">Delivery status</p>
          <h1 className="mt-3 text-[34px] font-semibold tracking-tight text-ink">Track your order</h1>
          <p className="mt-4 max-w-md text-[14px] leading-6 text-ink2">
            Enter the order reference from your confirmation and the same phone number used at checkout.
          </p>
          <form onSubmit={trackOrder} className="mt-8 space-y-5">
            <label className="block text-[12px] text-ink2">
              Order reference
              <input required name="reference" defaultValue={searchParams.get("reference") ?? ""} minLength={8} maxLength={40} autoComplete="off" placeholder="FER-260806-ABC123" className="mt-2 w-full rounded-card border border-line bg-white px-4 py-3 text-[14px] uppercase text-ink outline-none transition focus:border-ink" />
            </label>
            <label className="block text-[12px] text-ink2">
              Checkout phone
              <input required name="phone" type="tel" minLength={11} maxLength={20} autoComplete="tel" placeholder="01XXXXXXXXX" className="mt-2 w-full rounded-card border border-line bg-white px-4 py-3 text-[14px] text-ink outline-none transition focus:border-ink" />
            </label>
            <button disabled={loading} className="rounded-full bg-ink px-6 py-3 text-[14px] font-medium text-white disabled:opacity-50">
              {loading ? "Checking order…" : "Track order"}
            </button>
          </form>
          {error && <p role="alert" className="mt-5 text-[13px] text-red-700">{error}</p>}
        </section>

        <section aria-live="polite">
          {tracking ? (
            <div className="rounded-card border border-line p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
                <div>
                  <p className="text-[11px] uppercase tracking-eyebrow text-ink2">{tracking.reference}</p>
                  <h2 className="mt-2 text-[24px] font-semibold tracking-tight text-ink">{tracking.shipment?.statusLabel ?? tracking.statusLabel}</h2>
                </div>
                <div className="text-right text-[12px] text-ink2">
                  <p>{formatTaka(tracking.total)} · Cash on delivery</p>
                  <p className="mt-1">Placed {new Date(tracking.createdAt).toLocaleDateString("en-BD")}</p>
                </div>
              </div>
              {tracking.shipment && (
                <div className="mt-6 flex flex-wrap justify-between gap-3 rounded-card bg-[#f7f7f7] p-4 text-[12px]">
                  <div><p className="text-ink2">Courier</p><p className="mt-1 text-ink">{tracking.shipment.provider}</p></div>
                  <div className="text-right"><p className="text-ink2">Tracking number</p><p className="mt-1 text-ink">{tracking.shipment.trackingNumber || "Being assigned"}</p></div>
                </div>
              )}

              {/* Horizontal Order Status Timeline (X-Axis) */}
              <div className="mt-8 overflow-x-auto pb-4 pt-2 scrollbar-thin">
                <div className="min-w-[650px]">
                  <div className="relative">
                    {/* Background Line */}
                    <div className="absolute left-[10%] right-[10%] top-2 h-[2px] -translate-y-1/2 bg-line" />
                    
                    {/* Active Progress Line */}
                    {(() => {
                      const completedCount = stages.filter((s) => s.isCompleted).length;
                      const progressPercent = Math.max(
                        0,
                        ((completedCount - 1) / Math.max(1, stages.length - 1)) * 80
                      );
                      return (
                        <div
                          className="absolute left-[10%] top-2 h-[2px] -translate-y-1/2 bg-ink transition-all duration-500"
                          style={{ width: `${progressPercent}%` }}
                        />
                      );
                    })()}

                    {/* X-Axis Horizontal Grid of Nodes & Cards */}
                    <div
                      className="relative z-10 grid gap-2.5"
                      style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}
                    >
                      {stages.map((stage) => {
                        const isSolid = stage.isCompleted;
                        return (
                          <div key={stage.key} className="flex flex-col items-center">
                            {/* Dot Node */}
                            <div className="mb-4 flex h-4 items-center justify-center">
                              <div
                                className={`h-4 w-4 rounded-full transition-all duration-300 ${
                                  stage.isCancelled
                                    ? "bg-red-600 ring-4 ring-red-100"
                                    : isSolid
                                    ? "bg-ink ring-4 ring-white shadow-sm"
                                    : "border-2 border-line bg-white"
                                }`}
                              />
                            </div>

                            {/* Stage Card (Horizontally arranged on X-axis) */}
                            <div
                              className={`flex h-full w-full flex-col justify-between rounded-card border p-3.5 transition-all duration-200 ${
                                stage.isCancelled
                                  ? "border-red-200 bg-red-50/50 text-red-900"
                                  : isSolid
                                  ? "border-line bg-white text-ink shadow-sm"
                                  : "border-line/40 bg-gray-50/40 text-ink2/40 opacity-40 select-none"
                              }`}
                            >
                              <p className={`text-[12.5px] leading-snug ${isSolid ? "text-ink font-semibold" : "text-ink2/60"}`}>
                                {stage.label}
                              </p>
                              <div className="mt-3">
                                {stage.occurredAt ? (
                                  <time className="block text-[10.5px] leading-tight text-ink2">
                                    {new Date(stage.occurredAt).toLocaleString("en-BD", {
                                      month: "numeric",
                                      day: "numeric",
                                      year: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                      second: "2-digit",
                                      hour12: true,
                                    })}
                                  </time>
                                ) : (
                                  <span className="text-[10.5px] italic text-ink2/40">
                                    Pending
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[360px] items-center justify-center border-y border-line px-8 text-center">
              <p className="max-w-sm text-[13px] leading-6 text-ink2">Verified tracking updates will appear here. We never expose order details from a reference alone.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-5xl px-6 py-24 text-[13px] text-ink2">
          Loading order tracking…
        </main>
      }
    >
      <TrackOrderContent />
    </Suspense>
  );
}
