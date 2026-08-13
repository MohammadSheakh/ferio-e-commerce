"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Topbar from "@/components/Topbar";
import { formatTaka } from "@/lib/catalog";
import type { OrderDetail, OrderFulfillmentStatus } from "@/lib/orders";
import { orderStatusClass } from "@/lib/orders";
import type { Shipment, ShipmentProvider } from "@/lib/shipping";
import { shipmentStatusClass } from "@/lib/shipping";
import ReturnCasePanel from "@/components/returns/ReturnCasePanel";

const nextFulfillmentStatus: Partial<Record<OrderFulfillmentStatus, OrderFulfillmentStatus>> = {
  READY_FOR_FULFILLMENT: "PICKING",
  PICKING: "PACKED",
  PACKED: "QUALITY_CHECKED",
  QUALITY_CHECKED: "READY_FOR_HANDOVER",
  READY_FOR_HANDOVER: "HANDED_OVER",
};

const fulfillmentActionLabel: Partial<Record<OrderFulfillmentStatus, string>> = {
  PICKING: "Start picking",
  PACKED: "Confirm parcel packed",
  QUALITY_CHECKED: "Approve quality check",
  READY_FOR_HANDOVER: "Mark ready for courier",
  HANDED_OVER: "Record courier handover",
};

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [providers, setProviders] = useState<ShipmentProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<"STEADFAST" | "PATHAO">("STEADFAST");
  const [exceptionType, setExceptionType] = useState<"SHORTAGE" | "SUBSTITUTION" | "OTHER">("SHORTAGE");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/orders/${params.id}`, { cache: "no-store" });
      const payload = (await response.json()) as { data?: OrderDetail; message?: string };
      if (!response.ok || !payload.data) throw new Error(payload.message || "Unable to load order.");
      setOrder(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load order.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { void loadOrder(); }, [loadOrder]);

  useEffect(() => {
    async function loadShipping() {
      try {
        const [shipmentResponse, providerResponse] = await Promise.all([
          fetch(`/api/shipping/orders/${params.id}`, { cache: "no-store" }),
          fetch("/api/shipping/providers", { cache: "no-store" }),
        ]);
        const shipmentPayload = (await shipmentResponse.json()) as { data?: Shipment | null; message?: string };
        const providerPayload = (await providerResponse.json()) as { data?: ShipmentProvider[]; message?: string };
        if (!shipmentResponse.ok) throw new Error(shipmentPayload.message || "Unable to load shipment.");
        if (!providerResponse.ok || !providerPayload.data) throw new Error(providerPayload.message || "Unable to load courier providers.");
        setShipment(shipmentPayload.data ?? null);
        setProviders(providerPayload.data);
        const firstActive = providerPayload.data.find((provider) => provider.isActive);
        if (firstActive) setSelectedProvider(firstActive.code);
      } catch (shippingError) {
        setError(shippingError instanceof Error ? shippingError.message : "Unable to load shipping.");
      }
    }
    void loadShipping();
  }, [params.id]);

  async function createShipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      const providerData = selectedProvider === "PATHAO" ? {
        recipientCity: Number(form.get("recipientCity")),
        recipientZone: Number(form.get("recipientZone")),
        recipientArea: Number(form.get("recipientArea")),
      } : undefined;
      const response = await fetch(`/api/shipping/orders/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, parcelReady: true, note: String(form.get("note") || "") || undefined, providerData }),
      });
      const payload = (await response.json()) as { data?: Shipment; message?: string };
      if (!response.ok || !payload.data) throw new Error(payload.message || "Unable to create shipment.");
      setShipment(payload.data);
      await loadOrder();
    } catch (shipmentError) {
      setError(shipmentError instanceof Error ? shipmentError.message : "Unable to create shipment.");
    } finally { setSaving(false); }
  }

  async function confirmOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/orders/${params.id}/confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: String(form.get("note") || "") || undefined }) });
      const payload = (await response.json()) as { data?: OrderDetail; message?: string };
      if (!response.ok || !payload.data) throw new Error(payload.message || "Unable to confirm order.");
      setOrder(payload.data);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to confirm order.");
    } finally { setSaving(false); }
  }

  async function cancelOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/orders/${params.id}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: String(form.get("reason")) }) });
      const payload = (await response.json()) as { data?: OrderDetail; message?: string };
      if (!response.ok || !payload.data) throw new Error(payload.message || "Unable to cancel order.");
      setOrder(payload.data);
      formElement.reset();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to cancel order.");
    } finally { setSaving(false); }
  }

  async function advanceFulfillment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;
    const status = nextFulfillmentStatus[order.fulfillmentStatus];
    if (!status) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/orders/${params.id}/fulfillment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: String(form.get("note") || "") || undefined }),
      });
      const payload = (await response.json()) as { data?: OrderDetail; message?: string };
      if (!response.ok || !payload.data) throw new Error(payload.message || "Unable to update fulfillment.");
      setOrder(payload.data);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update fulfillment.");
    } finally { setSaving(false); }
  }

  async function recordException(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/orders/${params.id}/fulfillment-exceptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: exceptionType,
          orderItemId: String(form.get("orderItemId") || "") || undefined,
          quantity: form.get("quantity") ? Number(form.get("quantity")) : undefined,
          description: String(form.get("description") || ""),
        }),
      });
      const payload = (await response.json()) as { data?: OrderDetail; message?: string };
      if (!response.ok || !payload.data) throw new Error(payload.message || "Unable to record exception.");
      setOrder(payload.data);
      formElement.reset();
      setExceptionType("SHORTAGE");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to record exception.");
    } finally { setSaving(false); }
  }

  async function resolveException(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const exceptionId = String(form.get("exceptionId"));
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/orders/${params.id}/fulfillment-exceptions/${exceptionId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution: String(form.get("resolution") || "") }),
      });
      const payload = (await response.json()) as { data?: OrderDetail; message?: string };
      if (!response.ok || !payload.data) throw new Error(payload.message || "Unable to resolve exception.");
      setOrder(payload.data);
      formElement.reset();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to resolve exception.");
    } finally { setSaving(false); }
  }

  if (loading) return <><Topbar title="Order" subtitle="Loading order…" /><p className="p-8 text-[13px] text-ink2">Loading order…</p></>;
  if (!order) return <><Topbar title="Order" subtitle="Unavailable" /><p role="alert" className="p-8 text-[13px] text-rose-700">{error || "Order not found."}</p></>;

  const activeReservations = order.items.flatMap((item) => item.reservations).filter((reservation) => reservation.status === "ACTIVE");
  const nextFulfillment = nextFulfillmentStatus[order.fulfillmentStatus];
  const canAdvanceFulfillment = nextFulfillment && (nextFulfillment !== "HANDED_OVER" || shipment);

  return (
    <>
      <Topbar title={order.reference} subtitle={`Placed ${new Date(order.createdAt).toLocaleString("en-BD")}`} />
      <div className="grid gap-8 p-8 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-8">
          <section className="rounded-card border border-line p-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-[16px] font-medium text-ink">Order state</h2><p className="mt-1 text-[12px] text-ink2">Lifecycle states remain separate and server-controlled.</p></div><span className={`rounded-full px-3 py-1.5 text-[11px] ${orderStatusClass[order.status]}`}>{order.status.replaceAll("_", " ").toLowerCase()}</span></div>
            <dl className="mt-6 grid gap-5 text-[12px] sm:grid-cols-3"><div><dt className="text-ink2">Payment</dt><dd className="mt-1 text-ink">{order.paymentStatus.toLowerCase()}</dd></div><div><dt className="text-ink2">Fulfillment</dt><dd className="mt-1 text-ink">{order.fulfillmentStatus.replaceAll("_", " ").toLowerCase()}</dd></div><div><dt className="text-ink2">Shipment</dt><dd className="mt-1 text-ink">{order.shipmentStatus.replaceAll("_", " ").toLowerCase()}</dd></div><div><dt className="text-ink2">Return</dt><dd className="mt-1 text-ink">{order.returnStatus.toLowerCase()}</dd></div><div><dt className="text-ink2">Refund</dt><dd className="mt-1 text-ink">{order.refundStatus.toLowerCase()}</dd></div><div><dt className="text-ink2">COD verification</dt><dd className="mt-1 text-ink">{order.codVerification.replaceAll("_", " ").toLowerCase()}</dd></div></dl>
          </section>

          <section className="rounded-card border border-line p-6"><h2 className="text-[16px] font-medium text-ink">Immutable item snapshots</h2><div className="mt-4 divide-y divide-line">{order.items.map((item) => <div key={item.id} className="grid gap-2 py-4 text-[13px] sm:grid-cols-[1fr_100px_120px]"><div><p className="text-ink">{item.productName} · {item.variantName}</p><p className="mt-0.5 text-[11px] text-ink2">{item.sku} · {formatTaka(item.unitPrice)} each{item.productCondition === "SECOND_HAND" ? ` · second-hand (${item.conditionGrade?.replaceAll("_", " ").toLowerCase()})` : ""}</p>{item.conditionNote && <p className="mt-2 text-[12px] leading-5 text-ink2">{item.conditionNote}</p>}</div><span className="text-ink2">Quantity {item.quantity}</span><span className="text-right text-ink">{formatTaka(item.lineTotal)}</span></div>)}</div><div className="ml-auto mt-4 max-w-xs space-y-2 border-t border-line pt-4 text-[13px]"><div className="flex justify-between text-ink2"><span>Subtotal</span><span>{formatTaka(order.subtotal)}</span></div><div className="flex justify-between text-ink2"><span>Delivery</span><span>{order.deliveryFee === 0 ? "Free" : formatTaka(order.deliveryFee)}</span></div><div className="flex justify-between text-[15px] font-semibold text-ink"><span>Total</span><span>{formatTaka(order.total)}</span></div></div></section>

          <ReturnCasePanel order={order} />

          <section><h2 className="text-[16px] font-medium text-ink">Status history</h2><div className="mt-4 divide-y divide-line border-y border-line">{order.statusHistory.map((entry) => <div key={entry.id} className="grid gap-2 py-4 text-[12px] md:grid-cols-[170px_1fr_150px]"><span className="text-ink">{entry.oldStatus ? `${entry.oldStatus.replaceAll("_", " ")} → ` : ""}{entry.newStatus.replaceAll("_", " ")}</span><span className="text-ink2">{entry.note || "No note"} · {entry.source.toLowerCase()}</span><time className="text-ink2">{new Date(entry.createdAt).toLocaleString("en-BD")}</time></div>)}</div></section>
          <section><h2 className="text-[16px] font-medium text-ink">Fulfillment history</h2><div className="mt-4 divide-y divide-line border-y border-line">{order.fulfillmentHistory.length === 0 ? <p className="py-4 text-[12px] text-ink2">No warehouse action recorded yet.</p> : order.fulfillmentHistory.map((entry) => <div key={entry.id} className="grid gap-2 py-4 text-[12px] md:grid-cols-[210px_1fr_150px]"><span className="text-ink">{entry.oldStatus ? `${entry.oldStatus.replaceAll("_", " ")} → ` : ""}{entry.newStatus.replaceAll("_", " ")}</span><span className="text-ink2">{entry.note || "No note"} · {entry.source.toLowerCase()}</span><time className="text-ink2">{new Date(entry.createdAt).toLocaleString("en-BD")}</time></div>)}</div></section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-card border border-line p-6"><h2 className="text-[13px] font-medium text-ink">Customer and address snapshot</h2><p className="mt-4 text-[13px] text-ink">{order.customer.name}</p><p className="text-[13px] text-ink2">{order.customer.phone}</p>{order.customer.email && <p className="text-[13px] text-ink2">{order.customer.email}</p>}{order.address && <address className="mt-4 not-italic text-[13px] leading-6 text-ink/80">{order.address.detailedAddress}<br />{order.address.area}, {order.address.district}{order.address.landmark && <><br />Landmark: {order.address.landmark}</>}</address>}{order.customerNote && <div className="mt-5 border-t border-line pt-4"><p className="text-[11px] uppercase tracking-eyebrow text-ink2">Customer note</p><p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-ink">{order.customerNote}</p></div>}</section>
          <section className="rounded-card border border-line p-6"><h2 className="text-[13px] font-medium text-ink">Reservation</h2><p className="mt-3 text-[13px] text-ink2">{activeReservations.length === 0 ? "No active reservation." : `${activeReservations.reduce((total, item) => total + item.quantity, 0)} units actively reserved.`}</p>{activeReservations.map((reservation) => <p key={reservation.id} className="mt-2 text-[12px] text-ink">{reservation.quantity} · {reservation.inventory.warehouse.name}</p>)}</section>
          {order.status === "CONFIRMED" && nextFulfillment && <form onSubmit={advanceFulfillment} className="rounded-card border border-line p-5"><h2 className="text-[13px] font-medium text-ink">Warehouse action</h2><p className="mt-1 text-[12px] leading-5 text-ink2">Next required state: {nextFulfillment.replaceAll("_", " ").toLowerCase()}.</p><textarea name="note" rows={2} maxLength={500} placeholder="Optional operational note" className="mt-4 w-full rounded-card border border-line px-3.5 py-2.5 text-[13px] outline-none focus:border-ink" /><button disabled={saving || !canAdvanceFulfillment} className="mt-3 rounded-full bg-ink px-5 py-2.5 text-[13px] text-white disabled:opacity-40">{saving ? "Saving…" : fulfillmentActionLabel[nextFulfillment]}</button>{nextFulfillment === "HANDED_OVER" && !shipment && <p className="mt-2 text-[11px] text-amber-700">Create the courier shipment before recording handover.</p>}</form>}
          {order.fulfillmentStatus === "PICKING" && <form onSubmit={recordException} className="rounded-card border border-line p-5"><h2 className="text-[13px] font-medium text-ink">Record picking exception</h2><p className="mt-1 text-[12px] leading-5 text-ink2">Shortages and substitutions stay explicit and block packing until resolved.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-[11px] text-ink2">Type<select value={exceptionType} onChange={(event) => setExceptionType(event.target.value as typeof exceptionType)} name="type" className="mt-1 w-full rounded-card border border-line px-3 py-2.5 text-[13px]"><option value="SHORTAGE">Shortage</option><option value="SUBSTITUTION">Substitution</option><option value="OTHER">Other</option></select></label><label className="text-[11px] text-ink2">Order item<select required={exceptionType === "SHORTAGE"} name="orderItemId" className="mt-1 w-full rounded-card border border-line px-3 py-2.5 text-[13px]"><option value="">General exception</option>{order.items.map((item) => <option key={item.id} value={item.id}>{item.productName} · {item.variantName}</option>)}</select></label></div>{exceptionType === "SHORTAGE" && <label className="mt-3 block text-[11px] text-ink2">Affected quantity<input required name="quantity" type="number" min="1" className="mt-1 w-full rounded-card border border-line px-3 py-2.5 text-[13px]" /></label>}<textarea required name="description" minLength={3} maxLength={500} rows={3} placeholder="What was found while picking?" className="mt-3 w-full rounded-card border border-line px-3.5 py-2.5 text-[13px] outline-none focus:border-ink" /><button disabled={saving} className="mt-3 rounded-full border border-line px-5 py-2.5 text-[13px] text-ink disabled:opacity-40">Record exception</button></form>}
          {order.fulfillmentExceptions.length > 0 && <section className="rounded-card border border-line p-5"><h2 className="text-[13px] font-medium text-ink">Fulfillment exceptions</h2><div className="mt-3 divide-y divide-line">{order.fulfillmentExceptions.map((entry) => <div key={entry.id} className="py-4"><div className="flex justify-between gap-3 text-[12px]"><span className="text-ink">{entry.type.toLowerCase()} · {entry.orderItem ? `${entry.orderItem.productName} ${entry.orderItem.variantName}` : "General"}</span><span className={entry.status === "OPEN" ? "text-amber-700" : "text-emerald-700"}>{entry.status.toLowerCase()}</span></div><p className="mt-1 text-[12px] leading-5 text-ink2">{entry.description}{entry.quantity ? ` · Quantity ${entry.quantity}` : ""}</p>{entry.resolution && <p className="mt-2 text-[12px] text-ink">Resolution: {entry.resolution}</p>}{entry.status === "OPEN" && <form onSubmit={resolveException} className="mt-3 flex gap-2"><input type="hidden" name="exceptionId" value={entry.id} /><input required name="resolution" minLength={3} maxLength={500} placeholder="Resolution note" className="min-w-0 flex-1 rounded-card border border-line px-3 py-2 text-[12px]" /><button disabled={saving} className="rounded-full bg-ink px-4 py-2 text-[11px] text-white disabled:opacity-40">Resolve</button></form>}</div>)}</div></section>}
          {shipment ? <section className="rounded-card border border-line p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-[13px] font-medium text-ink">Courier shipment</h2><span className={`rounded-full px-2.5 py-1 text-[11px] ${shipmentStatusClass(shipment.status)}`}>{shipment.status.replaceAll("_", " ").toLowerCase()}</span></div><p className="mt-4 text-[13px] text-ink">{shipment.provider.name}</p><p className="mt-1 text-[12px] text-ink2">Tracking: {shipment.trackingNumber || "Pending provider response"}</p><p className="text-[12px] text-ink2">Weight: {(shipment.weightGrams / 1000).toFixed(2)} kg · COD {formatTaka(shipment.codAmount)}</p>{shipment.exceptionReason && <p className="mt-3 text-[12px] text-amber-700">{shipment.exceptionReason}</p>}<div className="mt-5 divide-y divide-line border-y border-line">{shipment.events?.map((entry) => <div key={entry.id} className="py-3 text-[12px]"><div className="flex justify-between gap-3"><span className="text-ink">{entry.normalizedStatus.replaceAll("_", " ").toLowerCase()}</span><time className="text-ink2">{new Date(entry.occurredAt).toLocaleString("en-BD")}</time></div><p className="mt-1 text-ink2">Provider: {entry.rawStatus}{entry.ignoredReason ? ` · Ignored: ${entry.ignoredReason}` : ""}</p></div>)}</div></section> : order.fulfillmentStatus === "READY_FOR_HANDOVER" && <form onSubmit={createShipment} className="rounded-card border border-line p-5"><h2 className="text-[13px] font-medium text-ink">Create courier parcel</h2><p className="mt-1 text-[12px] leading-5 text-ink2">Quality check is complete. Provider credentials must be active.</p><label className="mt-4 block text-[12px] text-ink2">Courier<select value={selectedProvider} onChange={(event) => setSelectedProvider(event.target.value as "STEADFAST" | "PATHAO")} className="mt-1.5 w-full rounded-card border border-line px-3.5 py-2.5 text-[13px] outline-none focus:border-ink">{providers.filter((provider) => provider.isActive).map((provider) => <option key={provider.code} value={provider.code}>{provider.name}</option>)}</select></label>{selectedProvider === "PATHAO" && <div className="mt-4 grid grid-cols-3 gap-2">{["recipientCity", "recipientZone", "recipientArea"].map((field) => <label key={field} className="text-[11px] text-ink2">{field.replace("recipient", "")} ID<input required name={field} type="number" min="1" className="mt-1 w-full rounded-card border border-line px-2.5 py-2 text-[13px] outline-none focus:border-ink" /></label>)}</div>}<textarea name="note" rows={3} maxLength={500} placeholder="Optional delivery instruction" className="mt-4 w-full rounded-card border border-line px-3.5 py-2.5 text-[13px] outline-none focus:border-ink" /><button disabled={saving || providers.every((provider) => !provider.isActive)} className="mt-3 rounded-full bg-ink px-5 py-2.5 text-[13px] text-white disabled:opacity-40">{saving ? "Creating parcel…" : "Create courier shipment"}</button></form>}
          {error && <p role="alert" className="text-[13px] text-rose-700">{error}</p>}
          {order.status === "PENDING_CONFIRMATION" && <form onSubmit={confirmOrder} className="rounded-card border border-line p-5"><h2 className="text-[13px] font-medium text-ink">Confirm by phone</h2><p className="mt-1 text-[12px] leading-5 text-ink2">Verify customer and address first. Confirmation reserves available stock atomically.</p><textarea name="note" rows={3} maxLength={500} placeholder="Optional confirmation note" className="mt-4 w-full rounded-card border border-line px-3.5 py-2.5 text-[13px] outline-none focus:border-ink" /><button disabled={saving} className="mt-3 rounded-full bg-ink px-5 py-2.5 text-[13px] text-white disabled:opacity-50">{saving ? "Confirming…" : "Confirm COD order"}</button></form>}
          {(order.status === "PENDING_CONFIRMATION" || order.status === "CONFIRMED") && <form onSubmit={cancelOrder} className="rounded-card border border-line p-5"><h2 className="text-[13px] font-medium text-ink">Cancel order</h2><p className="mt-1 text-[12px] leading-5 text-ink2">A reason is required. Any active reservation is released in the same transaction.</p><textarea required name="reason" minLength={3} maxLength={500} rows={3} className="mt-4 w-full rounded-card border border-line px-3.5 py-2.5 text-[13px] outline-none focus:border-ink" /><button disabled={saving} className="mt-3 rounded-full border border-rose-200 px-5 py-2.5 text-[13px] text-rose-700 disabled:opacity-50">{saving ? "Cancelling…" : "Cancel order"}</button></form>}
        </aside>
      </div>
    </>
  );
}
