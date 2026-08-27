"use client";

import { FormEvent, useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import type { CatalogProduct, ProductPage } from "@/lib/catalog";
import type { CommerceSettings } from "@/lib/commerce-settings";
import type { PurchaseActivityPage } from "@/lib/purchase-activity";

type Form = Pick<
  CommerceSettings,
  | "purchaseActivityEnabled"
  | "purchaseHistoryEnabled"
  | "purchaseActivityShowDistrict"
  | "purchaseActivityShowArea"
  | "purchaseActivityDurationMs"
  | "purchaseActivityIntervalSeconds"
  | "purchaseActivityMaxAgeDays"
> & { excludedProductIds: string[] };

function toForm(settings: CommerceSettings): Form {
  return {
    purchaseActivityEnabled: settings.purchaseActivityEnabled,
    purchaseHistoryEnabled: settings.purchaseHistoryEnabled,
    purchaseActivityShowDistrict: settings.purchaseActivityShowDistrict,
    purchaseActivityShowArea: settings.purchaseActivityShowArea,
    purchaseActivityDurationMs: settings.purchaseActivityDurationMs,
    purchaseActivityIntervalSeconds: settings.purchaseActivityIntervalSeconds,
    purchaseActivityMaxAgeDays: settings.purchaseActivityMaxAgeDays,
    excludedProductIds: settings.purchaseActivityExcludedProductIds,
  };
}

export default function PurchaseActivityAdminPage() {
  const [form, setForm] = useState<Form | null>(null);
  const [activity, setActivity] = useState<PurchaseActivityPage | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<CatalogProduct[]>([]);
  const [knownProducts, setKnownProducts] = useState<Record<string, CatalogProduct>>({});
  const [productsLoading, setProductsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/commerce-settings", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/purchase-activity?limit=12", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/catalog/products?limit=100&sort=name-asc", { cache: "no-store" }).then((response) => response.json()),
    ])
      .then(([settingsPayload, activityPayload, productsPayload]) => {
        if (!settingsPayload.data) throw new Error(settingsPayload.message || "Unable to load settings.");
        setForm(toForm(settingsPayload.data));
        setActivity(activityPayload.data || null);
        const products = (productsPayload.data as ProductPage | undefined)?.items ?? [];
        setProductResults(products.slice(0, 8));
        setKnownProducts(Object.fromEntries(products.map((product) => [product.id, product])));
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load purchase activity."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const query = productSearch.trim();
    if (!query) return;
    const timer = window.setTimeout(async () => {
      setProductsLoading(true);
      try {
        const response = await fetch(`/api/catalog/products?limit=8&search=${encodeURIComponent(query)}&sort=name-asc`, { cache: "no-store" });
        const payload = (await response.json()) as { data?: ProductPage };
        const products = payload.data?.items ?? [];
        setProductResults(products);
        setKnownProducts((current) => ({ ...current, ...Object.fromEntries(products.map((product) => [product.id, product])) }));
      } finally {
        setProductsLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [productSearch]);

  const set = <Key extends keyof Form>(key: Key, value: Form[Key]) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/commerce-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseActivityEnabled: form.purchaseActivityEnabled,
          purchaseHistoryEnabled: form.purchaseHistoryEnabled,
          purchaseActivityShowDistrict: form.purchaseActivityShowDistrict,
          purchaseActivityShowArea: form.purchaseActivityShowArea,
          purchaseActivityDurationMs: Number(form.purchaseActivityDurationMs),
          purchaseActivityIntervalSeconds: Number(form.purchaseActivityIntervalSeconds),
          purchaseActivityMaxAgeDays: Number(form.purchaseActivityMaxAgeDays),
          purchaseActivityExcludedProductIds: form.excludedProductIds,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.data) throw new Error(payload.message || "Unable to save settings.");
      setForm(toForm(payload.data));
      setMessage("Global order history controls saved and audited.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "mt-1.5 w-full rounded-card border border-line px-3.5 py-2.5 text-[14px] outline-none focus:border-ink";
  const availableResults = productResults.filter((product) => !form?.excludedProductIds.includes(product.id));
  return (
    <>
      <Topbar title="Global order history" subtitle="Privacy-safe social proof from real completed orders" />
      <main className="p-8">
        {loading ? <p className="py-16 text-center text-[13px] text-ink2">Loading controls…</p> : null}
        {form ? (
          <div className="mx-auto grid max-w-6xl gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <form onSubmit={save} className="space-y-8">
              <section className="border-b border-line pb-7">
                <h2 className="text-[17px] font-medium text-ink">Public visibility</h2>
                <p className="mt-2 text-[12px] leading-5 text-ink2">Both controls are off by default. Only opted-in delivered or completed purchases qualify.</p>
                <div className="mt-5 space-y-4">
                  <label className="flex items-start gap-3 text-[13px] text-ink"><input type="checkbox" checked={form.purchaseActivityEnabled} onChange={(event) => set("purchaseActivityEnabled", event.target.checked)} className="mt-0.5" /><span>Website popup<span className="block text-[11px] text-ink2">Show a temporary side popup to visitors.</span></span></label>
                  <label className="flex items-start gap-3 text-[13px] text-ink"><input type="checkbox" checked={form.purchaseHistoryEnabled} onChange={(event) => set("purchaseHistoryEnabled", event.target.checked)} className="mt-0.5" /><span>Global history page<span className="block text-[11px] text-ink2">Publish the paginated customer history page and footer link.</span></span></label>
                  <label className="flex items-start gap-3 text-[13px] text-ink"><input type="checkbox" checked={form.purchaseActivityShowDistrict} onChange={(event) => set("purchaseActivityShowDistrict", event.target.checked)} className="mt-0.5" /><span>Show district<span className="block text-[11px] text-ink2">Example: Dhaka. Full address is never shown.</span></span></label>
                  <label className="flex items-start gap-3 text-[13px] text-ink"><input type="checkbox" checked={form.purchaseActivityShowArea} onChange={(event) => set("purchaseActivityShowArea", event.target.checked)} className="mt-0.5" /><span>Show local area<span className="block text-[11px] text-ink2">Example: Rampura Bazar. This takes priority over district.</span></span></label>
                </div>
              </section>
              <section className="grid gap-4 border-b border-line pb-7 sm:grid-cols-3">
                <label className="text-[12px] text-ink2">Popup duration (ms)<input required type="number" min="2000" max="10000" value={form.purchaseActivityDurationMs} onChange={(event) => set("purchaseActivityDurationMs", Number(event.target.value))} className={inputClass} /></label>
                <label className="text-[12px] text-ink2">Interval (seconds)<input required type="number" min="6" max="120" value={form.purchaseActivityIntervalSeconds} onChange={(event) => set("purchaseActivityIntervalSeconds", Number(event.target.value))} className={inputClass} /></label>
                <label className="text-[12px] text-ink2">Maximum age (days)<input required type="number" min="1" max="365" value={form.purchaseActivityMaxAgeDays} onChange={(event) => set("purchaseActivityMaxAgeDays", Number(event.target.value))} className={inputClass} /></label>
              </section>
              <section>
                <label className="block text-[12px] text-ink2">Products that must never appear<input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Search product name, brand, or SKU" className={inputClass} /></label>
                <div className="mt-2 border-y border-line">
                  {availableResults.slice(0, 6).map((product) => <button key={product.id} type="button" onClick={() => { set("excludedProductIds", [...form.excludedProductIds, product.id]); setProductSearch(""); }} className="flex w-full items-center justify-between gap-4 border-b border-line px-1 py-3 text-left last:border-b-0"><span><span className="block text-[13px] text-ink">{product.name}</span><span className="mt-0.5 block text-[11px] text-ink2">{product.category.name} · {product.status.toLowerCase()}</span></span><span className="text-[11px] text-ink2">Exclude</span></button>)}
                  {productSearch && !productsLoading && !availableResults.length ? <p className="py-5 text-center text-[12px] text-ink2">No matching products.</p> : null}
                  {productsLoading ? <p className="py-5 text-center text-[12px] text-ink2">Searching…</p> : null}
                </div>
                <div className="mt-5 space-y-2">
                  <p className="text-[11px] uppercase tracking-eyebrow text-ink2">Excluded products · {form.excludedProductIds.length}</p>
                  {form.excludedProductIds.map((productId) => { const product = knownProducts[productId]; return <div key={productId} className="flex items-center justify-between gap-4 border-b border-line py-3"><span><span className="block text-[13px] text-ink">{product?.name ?? "Catalog product"}</span><span className="mt-0.5 block text-[11px] text-ink2">{product?.category.name ?? productId}</span></span><button type="button" onClick={() => set("excludedProductIds", form.excludedProductIds.filter((id) => id !== productId))} className="text-[11px] text-rose-700">Remove</button></div>; })}
                  {!form.excludedProductIds.length ? <p className="py-3 text-[12px] text-ink2">No products are excluded.</p> : null}
                </div>
              </section>
              <p className="border-l-2 border-ink pl-4 text-[12px] leading-5 text-ink2">Activity cannot be manually created or edited. This prevents fake social proof and keeps every public entry tied to a real eligible order.</p>
              {(message || error) ? <p role={error ? "alert" : "status"} className={`text-[12px] ${error ? "text-rose-700" : "text-emerald-700"}`}>{error || message}</p> : null}
              <button disabled={saving} className="rounded-full bg-ink px-6 py-2.5 text-[13px] font-medium text-white disabled:opacity-50">{saving ? "Saving…" : "Save controls"}</button>
            </form>
            <section>
              <div className="flex items-end justify-between border-b border-line pb-4"><div><h2 className="text-[17px] font-medium text-ink">Eligible activity preview</h2><p className="mt-1 text-[12px] text-ink2">{activity?.total ?? 0} real order items currently qualify.</p></div></div>
              <div className="divide-y divide-line">
                {activity?.items.map((item) => <article key={item.id} className="flex gap-3 py-4"><div className="h-14 w-14 shrink-0 overflow-hidden rounded-card bg-surface">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : null}</div><div><p className="text-[13px] text-ink">{item.customerName} ordered {item.productName}{item.additionalItemCount > 0 ? ` +${item.additionalItemCount} ${item.additionalItemCount === 1 ? "item" : "items"}` : ""}{item.location ? ` from ${item.location}` : ""}</p><p className="mt-1 text-[11px] text-ink2">{item.variantName} · {new Date(item.purchasedAt).toLocaleString()}</p><p className="mt-1 text-[11px] text-ink2">Product ID: {item.productId}</p></div></article>)}
                {!activity?.items.length ? <p className="py-14 text-center text-[13px] text-ink2">No opted-in completed purchases qualify yet.</p> : null}
              </div>
            </section>
          </div>
        ) : null}
      </main>
    </>
  );
}
