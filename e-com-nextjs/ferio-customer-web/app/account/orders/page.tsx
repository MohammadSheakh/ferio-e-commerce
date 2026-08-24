"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import type { CommerceAccount } from "@/lib/account";
import { formatTaka } from "@/lib/catalog";
import CustomerLogoutButton from "@/components/CustomerLogoutButton";
import { useCart } from "@/components/CartContext";

export default function AccountOrdersPage() {
  const router = useRouter();
  const { revalidate } = useCart();
  const [account, setAccount] = useState<CommerceAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [message, setMessage] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [reorderResult, setReorderResult] = useState<{
    summary: string;
    addedItems: any[];
    unavailableItems: any[];
  } | null>(null);

  async function load() {
    const response = await fetch("/api/account/commerce", { cache: "no-store" });
    const payload = await response.json();
    if (response.status === 401) setUnauthorized(true);
    else if (response.ok) setAccount(payload.data);
    else setMessage(payload.message || "Unable to load your account.");
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleReorder(orderId: string, orderItemIds?: string[]) {
    const targetKey = orderItemIds ? `${orderId}-${orderItemIds.join(",")}` : orderId;
    setReorderingId(targetKey);
    setReorderResult(null);
    try {
      const response = await fetch(`/api/cart/reorder/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderItemIds }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to reorder items.");
      }
      await revalidate();
      setReorderResult({
        summary: data.summary || "Items added to your cart!",
        addedItems: data.addedItems || [],
        unavailableItems: data.unavailableItems || [],
      });
    } catch (err: any) {
      alert(err.message || "Could not reorder items.");
    } finally {
      setReorderingId(null);
    }
  }

  async function linkAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLinking(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/account/commerce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference: form.get("reference"),
        phone: form.get("phone"),
      }),
    });
    const payload = await response.json();
    if (response.ok) {
      setAccount(payload.data);
      setMessage("Order history linked to this account.");
      event.currentTarget.reset();
    } else setMessage(payload.message || "Unable to verify that order.");
    setLinking(false);
  }

  const inputClass =
    "mt-1.5 w-full rounded-card border border-line px-4 py-3 text-[14px] outline-none focus:border-ink";

  if (loading)
    return (
      <main className="mx-auto max-w-6xl px-6 py-20 text-[13px] text-ink2">
        Loading your account…
      </main>
    );

  if (unauthorized)
    return (
      <main className="mx-auto max-w-xl px-6 py-20">
        <h1 className="text-[28px] font-semibold tracking-tight text-ink">
          Your orders
        </h1>
        <p className="mt-3 text-[13px] leading-6 text-ink2">
          Sign in first. Your commerce history is linked only after you verify
          an order reference and its checkout phone.
        </p>
        <Link
          href="/account/login?next=/account/orders"
          className="mt-7 inline-block rounded-full bg-ink px-6 py-3 text-[13px] text-white"
        >
          Sign in
        </Link>
      </main>
    );

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <p className="text-[11px] uppercase tracking-eyebrow text-ink2">
        Customer account
      </p>
      <h1 className="mt-2 text-[30px] font-semibold tracking-tight text-ink">
        Your orders
      </h1>
      <div className="mt-2 flex items-center gap-4">
        <p className="text-[13px] text-ink2">
          Signed in as {account?.account.email}
        </p>
        <CustomerLogoutButton />
      </div>

      {reorderResult && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-emerald-900">
              🛒 {reorderResult.summary}
            </h3>
            <button
              onClick={() => router.push("/cart")}
              className="rounded-full bg-emerald-700 px-4 py-1.5 text-[12.5px] font-medium text-white hover:bg-emerald-800"
            >
              Go to Cart →
            </button>
          </div>

          {reorderResult.unavailableItems.length > 0 && (
            <div className="mt-3 border-t border-emerald-200/60 pt-3">
              <p className="text-[12px] font-semibold text-amber-900">
                Unavailable / Out of stock items skipped:
              </p>
              <ul className="mt-1 space-y-1 text-[11.5px] text-amber-800">
                {reorderResult.unavailableItems.map((u, idx) => (
                  <li key={idx}>
                    • <span className="font-medium">{u.productName}</span> ({u.variantName}) — {u.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!account?.linked ? (
        <section className="mt-10 max-w-xl border-y border-line py-8">
          <h2 className="text-[18px] font-medium text-ink">
            Link your purchase history
          </h2>
          <p className="mt-2 text-[13px] leading-6 text-ink2">
            Verify one order using the exact checkout phone. Ferio will link the
            customer profile behind that order to this account. Email or phone
            similarity alone is never used.
          </p>
          <form onSubmit={linkAccount} className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-[12px] text-ink2">
              Order reference
              <input
                name="reference"
                required
                minLength={6}
                maxLength={64}
                className={inputClass}
              />
            </label>
            <label className="text-[12px] text-ink2">
              Checkout phone
              <input name="phone" required maxLength={32} className={inputClass} />
            </label>
            <button
              disabled={linking}
              className="w-fit rounded-full bg-ink px-6 py-3 text-[13px] text-white disabled:opacity-40"
            >
              {linking ? "Verifying…" : "Link order history"}
            </button>
          </form>
        </section>
      ) : null}

      {message ? (
        <p role="status" className="mt-5 text-[13px] text-ink2">
          {message}
        </p>
      ) : null}

      {account?.customer ? (
        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.7fr)]">
          <section>
            <div className="flex items-end justify-between border-b border-line pb-4">
              <div>
                <h2 className="text-[18px] font-medium text-ink">Order history</h2>
                <p className="mt-1 text-[12px] text-ink2">
                  {account.customer._count.orders} orders
                  {account.orderHistoryTruncated
                    ? ` · showing latest ${account.orderHistoryLimit}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href="/account/saved-carts"
                  className="text-[12px] text-ink2 underline underline-offset-4"
                >
                  Saved Carts
                </Link>
                <Link
                  href="/account/warranty"
                  className="text-[12px] text-ink2 underline underline-offset-4"
                >
                  Warranty claims
                </Link>
              </div>
            </div>

            <div className="divide-y divide-line">
              {account.customer.orders.map((order) => (
                <article key={order.id} className="py-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[15px] font-medium text-ink">
                        {order.reference}
                      </p>
                      <p className="mt-1 text-[11px] text-ink2">
                        {new Date(order.createdAt).toLocaleString("en-BD")} ·{" "}
                        {order.paymentMethod}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReorder(order.id)}
                        disabled={reorderingId === order.id}
                        className="inline-flex items-center gap-1 rounded-full bg-ink px-3.5 py-1 text-[11.5px] font-medium text-white hover:opacity-85 disabled:opacity-50 transition"
                      >
                        <span>🔄</span>
                        <span>{reorderingId === order.id ? "Reordering…" : "Re-order"}</span>
                      </button>
                      <span className="rounded-full bg-surface px-3 py-1 text-[11px] text-ink2">
                        {order.status.replaceAll("_", " ").toLowerCase()}
                      </span>
                    </div>
                  </div>

                  {/* Order Items with Per-Item Warranty & Re-order Button */}
                  <div className="mt-5 space-y-3">
                    {order.items.map((item) => {
                      const itemKey = `${order.id}-${item.id}`;
                      return (
                        <div
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line/60 bg-paper p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-card bg-surface">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : null}
                            </div>
                            <div>
                              <p className="text-[13px] font-medium text-ink">
                                {item.productName}
                              </p>
                              <p className="mt-1 text-[11px] text-ink2">
                                {item.variantName} · Qty {item.quantity} ·{" "}
                                {formatTaka(item.lineTotal)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleReorder(order.id, [item.id])}
                              disabled={reorderingId === itemKey}
                              className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1 text-[11px] font-medium text-ink hover:border-ink disabled:opacity-50"
                            >
                              <span>🛒</span>
                              <span>{reorderingId === itemKey ? "Adding…" : "Buy Again"}</span>
                            </button>

                            {["DELIVERED", "COMPLETED"].includes(order.status) && (
                              <Link
                                href={`/account/warranty?reference=${encodeURIComponent(
                                  order.reference,
                                )}&phone=${encodeURIComponent(
                                  account?.customer?.phoneNormalized || "",
                                )}&itemId=${encodeURIComponent(item.id)}`}
                                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1.5 text-[11.5px] font-medium text-ink hover:border-ink hover:shadow-xs transition-all"
                              >
                                <span>🛡️ Claim Warranty</span>
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 text-[12px] sm:grid-cols-4">
                    <p>
                      <span className="block text-[10px] uppercase tracking-eyebrow text-ink2">
                        Total
                      </span>
                      {formatTaka(order.total)}
                    </p>
                    <p>
                      <span className="block text-[10px] uppercase tracking-eyebrow text-ink2">
                        Payment
                      </span>
                      {order.paymentStatus.toLowerCase()}
                    </p>
                    <p>
                      <span className="block text-[10px] uppercase tracking-eyebrow text-ink2">
                        Delivery
                      </span>
                      {order.shipmentStatus.replaceAll("_", " ").toLowerCase()}
                    </p>
                    <p>
                      <span className="block text-[10px] uppercase tracking-eyebrow text-ink2">
                        Tracking
                      </span>
                      {order.shipment?.trackingNumber || "Not available"}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside>
            <h2 className="text-[18px] font-medium text-ink">Saved addresses</h2>
            <div className="mt-4 divide-y divide-line border-y border-line">
              {account.customer.addresses.map((address) => (
                <article key={address.id} className="py-4">
                  <p className="text-[13px] font-medium text-ink">
                    {address.label || "Address"}
                    {address.isDefault ? " · default" : ""}
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-ink2">
                    {address.detailedAddress}, {address.area}, {address.district}
                    {address.landmark ? ` · ${address.landmark}` : ""}
                  </p>
                </article>
              ))}
              {!account.customer.addresses.length ? (
                <p className="py-5 text-[12px] text-ink2">No saved addresses.</p>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
