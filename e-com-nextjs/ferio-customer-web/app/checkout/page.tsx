"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/CartContext";
import type {
  CheckoutPreview,
  CheckoutOrderResult,
  DeliveryOption,
  PaymentOptions,
} from "@/lib/checkout";
import { formatTaka } from "@/lib/catalog";
import type { PublicStoreConfig } from "@/lib/store";
import { createBrowserIdempotencyKey } from "@/lib/browser-identifiers";

type CheckoutForm = {
  name: string;
  phone: string;
  email: string;
  district: string;
  area: string;
  detailedAddress: string;
  landmark: string;
  customerNote: string;
  marketingConsent: boolean;
  purchaseActivityConsent: boolean;
  termsAccepted: boolean;
  paymentMethod: "COD" | "PREPAID" | "PAY_AT_STORE";
  paymentProvider: "SSLCOMMERZ" | "AAMARPAY";
  deliveryMethod: "HOME_DELIVERY" | "STORE_PICKUP";
  pickupStoreId: string;
  preferredPickupDate: string;
  preferredPickupSlot: string;
};

export interface SavedAddressItem {
  id: string;
  label?: string;
  recipientName: string;
  phoneOriginal: string;
  district: string;
  area: string;
  detailedAddress: string;
  landmark?: string;
  isDefault: boolean;
}

const emptyForm: CheckoutForm = {
  name: "",
  phone: "",
  email: "",
  district: "",
  area: "",
  detailedAddress: "",
  landmark: "",
  customerNote: "",
  marketingConsent: false,
  purchaseActivityConsent: false,
  termsAccepted: false,
  paymentMethod: "COD",
  paymentProvider: "SSLCOMMERZ",
  deliveryMethod: "HOME_DELIVERY",
  pickupStoreId: "",
  preferredPickupDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
  preferredPickupSlot: "10:00 AM - 01:00 PM",
};

const storageKey = "ferio_checkout_details";

export default function CheckoutPage() {
  const {
    cart,
    lines,
    subtotal,
    loading,
    error: cartError,
    clearError,
    setQty,
    replaceVariant,
  } = useCart();
  const router = useRouter();
  const [form, setForm] = useState<CheckoutForm>(emptyForm);
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [paymentOptions, setPaymentOptions] = useState<PaymentOptions | null>(null);
  const [support, setSupport] = useState<Pick<PublicStoreConfig, "supportPhone" | "supportEmail"> | null>(null);
  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [updatingVariant, setUpdatingVariant] = useState("");
  const [error, setError] = useState("");

  // Customer Account & Saved Addresses state
  const [savedAddresses, setSavedAddresses] = useState<SavedAddressItem[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [saveAddressToAccount, setSaveAddressToAccount] = useState(false);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [publicStores, setPublicStores] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && (lines.length === 0 || !cart.isValid)) {
      router.replace("/cart");
    }
  }, [cart.isValid, lines.length, loading, router]);

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(storageKey);
      if (saved) setForm({ ...emptyForm, ...(JSON.parse(saved) as CheckoutForm) });
    } catch {
      window.sessionStorage.removeItem(storageKey);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) window.sessionStorage.setItem(storageKey, JSON.stringify(form));
  }, [form, hydrated]);

  useEffect(() => {
    async function loadDeliveryOptions() {
      setOptionsLoading(true);
      try {
        const [response, paymentResponse, storeResponse, accountResponse, publicStoresResponse] = await Promise.all([
          fetch("/api/checkout/delivery-options", { cache: "no-store" }),
          fetch("/api/checkout/payment-options", { cache: "no-store" }),
          fetch("/api/store/config", { cache: "no-store" }),
          fetch("/api/account/commerce", { cache: "no-store" }),
          fetch("/api/store-locations", { cache: "no-store" }),
        ]);
        const payload = (await response.json()) as {
          data?: DeliveryOption[];
          message?: string;
        };
        if (!response.ok || !payload.data) {
          throw new Error(payload.message || "Unable to load delivery areas.");
        }
        setDeliveryOptions(payload.data);
        const paymentPayload = (await paymentResponse.json()) as { data?: PaymentOptions };
        if (publicStoresResponse.ok) {
          const storesPayload = await publicStoresResponse.json();
          const stores = storesPayload.data || storesPayload;
          if (Array.isArray(stores) && stores.length > 0) {
            setPublicStores(stores);
            setForm((prev) => ({
              ...prev,
              pickupStoreId: prev.pickupStoreId || stores[0].id,
            }));
          }
        }
        setPaymentOptions(paymentPayload.data ?? null);
        const storePayload = (await storeResponse.json()) as { data?: PublicStoreConfig };
        if (storePayload.data) setSupport(storePayload.data);

        // Account saved addresses
        if (accountResponse.ok) {
          const accPayload = await accountResponse.json();
          const acc = accPayload.account || accPayload.data?.account;
          const cust = accPayload.customer || accPayload.data?.customer;
          if (acc) setUserLoggedIn(true);

          if (cust?.addresses && cust.addresses.length > 0) {
            setSavedAddresses(cust.addresses);
            const defaultAddr = cust.addresses.find((a: SavedAddressItem) => a.isDefault) || cust.addresses[0];
            if (defaultAddr) {
              setSelectedAddressId(defaultAddr.id);
              setForm((prev) => ({
                ...prev,
                name: prev.name || defaultAddr.recipientName || acc?.name || "",
                phone: prev.phone || defaultAddr.phoneOriginal || acc?.phoneNumber || "",
                email: prev.email || acc?.email || "",
                district: prev.district || defaultAddr.district,
                area: prev.area || defaultAddr.area,
                detailedAddress: prev.detailedAddress || defaultAddr.detailedAddress,
                landmark: prev.landmark || defaultAddr.landmark || "",
              }));
            }
          } else if (acc) {
            setForm((prev) => ({
              ...prev,
              name: prev.name || acc.name || "",
              phone: prev.phone || acc.phoneNumber || "",
              email: prev.email || acc.email || "",
            }));
          }
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load delivery areas.",
        );
      } finally {
        setOptionsLoading(false);
      }
    }
    void loadDeliveryOptions();
  }, []);

  const districts = useMemo(
    () =>
      deliveryOptions
        .flatMap((zone) =>
          zone.districts.map((district) => ({
            ...district,
            zoneName: zone.name,
          })),
        )
        .sort((first, second) => first.name.localeCompare(second.name)),
    [deliveryOptions],
  );

  function selectSavedAddress(addr: SavedAddressItem) {
    setSelectedAddressId(addr.id);
    setForm((prev) => ({
      ...prev,
      name: addr.recipientName || prev.name,
      phone: addr.phoneOriginal || prev.phone,
      district: addr.district,
      area: addr.area,
      detailedAddress: addr.detailedAddress,
      landmark: addr.landmark || "",
    }));
    setPreview(null);
    setError("");
  }

  function updateForm<Key extends keyof CheckoutForm>(
    key: Key,
    value: CheckoutForm[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setPreview(null);
    setError("");
  }

  async function updateQuantity(variantId: string, quantity: number) {
    setUpdatingVariant(variantId);
    clearError();
    setPreview(null);
    try {
      await setQty(variantId, quantity);
    } catch {
      return;
    } finally {
      setUpdatingVariant("");
    }
  }

  async function updateVariant(
    variantId: string,
    replacementVariantId: string,
    quantity: number,
  ) {
    if (variantId === replacementVariantId) return;
    setUpdatingVariant(variantId);
    clearError();
    setPreview(null);
    try {
      await replaceVariant(variantId, replacementVariantId, quantity);
    } catch {
      return;
    } finally {
      setUpdatingVariant("");
    }
  }

  async function generatePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreviewing(true);
    setError("");
    try {
      const search = new URLSearchParams(window.location.search);
      const response = await fetch("/api/checkout/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          email: form.email || undefined,
          landmark: form.landmark || undefined,
          source: search.get("utm_source") || undefined,
          medium: search.get("utm_medium") || undefined,
          campaign: search.get("utm_campaign") || undefined,
        }),
      });
      const payload = (await response.json()) as {
        data?: CheckoutPreview;
        message?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.message || "Unable to calculate checkout total.");
      }
      setPreview(payload.data);

      // Save address in background if user checked the option
      if (userLoggedIn && saveAddressToAccount && !selectedAddressId) {
        void fetch("/api/account/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: "Home",
            recipientName: form.name,
            phone: form.phone,
            district: form.district,
            area: form.area,
            detailedAddress: form.detailedAddress,
            landmark: form.landmark || undefined,
            isDefault: savedAddresses.length === 0,
          }),
        });
      }
    } catch (previewError) {
      setError(
        previewError instanceof Error
          ? previewError.message
          : "Unable to calculate checkout total.",
      );
    } finally {
      setPreviewing(false);
    }
  }

  async function placeOrder() {
    if (!preview) return;
    setPlacing(true);
    setError("");
    const idempotencyStorageKey = "ferio_order_idempotency";
    try {
      let idempotencyKey = window.sessionStorage.getItem(idempotencyStorageKey);
      if (!idempotencyKey) {
        idempotencyKey = createBrowserIdempotencyKey();
        window.sessionStorage.setItem(idempotencyStorageKey, idempotencyKey);
      }
      const response = await fetch("/api/checkout/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey, paymentMethod: form.paymentMethod, paymentProvider: form.paymentMethod === "PREPAID" ? form.paymentProvider : undefined }),
      });
      const payload = (await response.json()) as {
        data?: CheckoutOrderResult;
        message?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.message || "Unable to place your order.");
      }
      window.sessionStorage.removeItem(storageKey);
      window.sessionStorage.removeItem(idempotencyStorageKey);
      if (payload.data.payment?.redirectUrl) {
        window.location.assign(payload.data.payment.redirectUrl);
        return;
      }
      const query = new URLSearchParams({
        reference: payload.data.reference,
        status: payload.data.status,
      });
      window.location.assign(`/order-confirmation?${query.toString()}`);
    } catch (placeError) {
      setError(
        placeError instanceof Error
          ? placeError.message
          : "Unable to place your order.",
      );
      setPlacing(false);
    }
  }

  if (loading || lines.length === 0 || !cart.isValid) return null;

  const inputClass =
    "mt-1.5 w-full rounded-card border border-line bg-white px-4 py-3 text-[14px] text-ink outline-none placeholder:text-ink2/70 focus:border-ink";

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-eyebrow text-ink2">
          Secure checkout preview
        </p>
        <h1 className="mt-2 text-[30px] font-semibold tracking-tight text-ink">
          Where should we deliver?
        </h1>
        <p className="mt-2 text-[14px] leading-6 text-ink2">
          Confirm your address and payment method to calculate the final total.
          Your cart is revalidated before every preview.
        </p>
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1.35fr_0.85fr]">
        <form onSubmit={generatePreview} className="space-y-9">
          <section>
            <h2 className="text-[12px] uppercase tracking-eyebrow text-ink2">
              Contact
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-[12px] text-ink2">
                Full name
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="text-[12px] text-ink2">
                Bangladesh mobile
                <input
                  required
                  type="tel"
                  maxLength={32}
                  autoComplete="tel"
                  placeholder="01712 345678"
                  value={form.phone}
                  onChange={(event) => updateForm("phone", event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="text-[12px] text-ink2 sm:col-span-2">
                Email <span className="text-ink2/70">(optional)</span>
                <input
                  type="email"
                  maxLength={160}
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) => updateForm("email", event.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
          </section>

          <section>
            <h2 className="text-[12px] uppercase tracking-eyebrow text-ink2">
              Order note
            </h2>
            <label className="mt-4 block text-[12px] text-ink2">
              Instructions for this order <span className="text-ink2/70">(optional)</span>
              <textarea
                rows={4}
                maxLength={1000}
                placeholder="Delivery timing, packaging, or other useful details"
                value={form.customerNote}
                onChange={(event) => updateForm("customerNote", event.target.value)}
                className={inputClass}
              />
              <span className="mt-1 block text-right text-[11px] text-ink2/70">
                {form.customerNote.length}/1000
              </span>
            </label>
          </section>

          <section>
            <h2 className="text-[12px] uppercase tracking-eyebrow text-ink2">
              Fulfillment Method
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div
                onClick={() => {
                  updateForm("deliveryMethod", "HOME_DELIVERY");
                  updateForm("paymentMethod", "COD");
                }}
                className={`cursor-pointer rounded-2xl border p-4 transition ${
                  form.deliveryMethod === "HOME_DELIVERY"
                    ? "border-ink bg-slate-900 text-white shadow-sm"
                    : "border-line bg-white hover:border-slate-400 text-ink"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🚚</span>
                  <span className="font-bold text-sm">Home Delivery</span>
                </div>
                <p className="mt-1 text-[11px] opacity-80">
                  Parcel delivered directly to your home or office address.
                </p>
              </div>

              <div
                onClick={() => {
                  updateForm("deliveryMethod", "STORE_PICKUP");
                  if (publicStores.length > 0 && !form.pickupStoreId) {
                    updateForm("pickupStoreId", publicStores[0].id);
                  }
                }}
                className={`cursor-pointer rounded-2xl border p-4 transition ${
                  form.deliveryMethod === "STORE_PICKUP"
                    ? "border-ink bg-slate-900 text-white shadow-sm"
                    : "border-line bg-white hover:border-slate-400 text-ink"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏪</span>
                    <span className="font-bold text-sm">Pickup from Store</span>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500 text-white">
                    Free (৳0)
                  </span>
                </div>
                <p className="mt-1 text-[11px] opacity-80">
                  Collect from our physical store outlet at your preferred date & time.
                </p>
              </div>
            </div>

            {form.deliveryMethod === "STORE_PICKUP" && (
              <div className="mt-4 p-5 rounded-2xl border border-amber-300 bg-amber-50/50 space-y-4">
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                  Select Physical Store Outlet
                </h3>
                {publicStores.length === 0 ? (
                  <p className="text-xs text-ink2">Loading active store outlets...</p>
                ) : (
                  <div className="grid gap-3">
                    {publicStores.map((store) => {
                      const isSelected = form.pickupStoreId === store.id;
                      return (
                        <div
                          key={store.id}
                          onClick={() => {
                            updateForm("pickupStoreId", store.id);
                            updateForm("district", store.district || "Dhaka");
                            updateForm("area", store.area || "Store");
                            updateForm("detailedAddress", store.address || store.name);
                          }}
                          className={`cursor-pointer p-3.5 rounded-xl border transition ${
                            isSelected
                              ? "border-ink bg-white shadow-sm ring-1 ring-ink"
                              : "border-line bg-white/70 hover:bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-ink">{store.name}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-line">
                              {store.code}
                            </span>
                          </div>
                          {store.address && (
                            <p className="text-[11px] text-ink2 mt-1">📍 {store.address}</p>
                          )}
                          <div className="flex items-center gap-4 text-[10px] text-ink2 mt-2 pt-2 border-t border-line/60">
                            {store.operatingHours && <span>⏰ {store.operatingHours}</span>}
                            {store.phone && <span>📞 {store.phone}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-ink mb-1">
                      Preferred Pickup Date
                    </label>
                    <input
                      type="date"
                      required
                      value={form.preferredPickupDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => updateForm("preferredPickupDate", e.target.value)}
                      className="w-full px-3 py-2 border border-line rounded-lg text-xs bg-white text-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-ink mb-1">
                      Preferred Pickup Time Slot
                    </label>
                    <select
                      value={form.preferredPickupSlot}
                      onChange={(e) => updateForm("preferredPickupSlot", e.target.value)}
                      className="w-full px-3 py-2 border border-line rounded-lg text-xs bg-white text-ink"
                    >
                      <option value="10:00 AM - 01:00 PM">10:00 AM - 01:00 PM</option>
                      <option value="02:00 PM - 05:00 PM">02:00 PM - 05:00 PM</option>
                      <option value="05:00 PM - 08:00 PM">05:00 PM - 08:00 PM</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-[12px] uppercase tracking-eyebrow text-ink2">
                {form.deliveryMethod === "STORE_PICKUP" ? "Contact & Verification Info" : "Delivery address"}
              </h2>
              {savedAddresses.length > 0 && form.deliveryMethod === "HOME_DELIVERY" && (
                <Link href="/account" target="_blank" className="text-[11px] text-blue-600 hover:underline">
                  Manage saved addresses
                </Link>
              )}
            </div>

            {/* Saved Address Selection */}
            {savedAddresses.length > 0 && (
              <div className="mt-4 space-y-3">
                <p className="text-[12px] font-medium text-ink">Choose from your saved addresses:</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {savedAddresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <div
                        key={addr.id}
                        onClick={() => selectSavedAddress(addr)}
                        className={`cursor-pointer rounded-2xl border p-4 transition text-left ${
                          isSelected
                            ? "border-ink bg-slate-900 text-white shadow-md"
                            : "border-line bg-white hover:border-slate-400 text-ink"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {addr.label || "Home"}
                          </span>
                          {addr.isDefault && (
                            <span className="text-[10px] text-emerald-400 font-semibold">★ Default</span>
                          )}
                        </div>
                        <p className="mt-2 text-[13px] font-bold">{addr.recipientName}</p>
                        <p className="text-[11px] opacity-80">{addr.phoneOriginal}</p>
                        <p className="mt-1 text-[11px] opacity-80 leading-relaxed line-clamp-2">
                          {addr.detailedAddress}, {addr.area}, {addr.district}
                        </p>
                      </div>
                    );
                  })}
                  
                  <div
                    onClick={() => {
                      setSelectedAddressId(null);
                      setForm((prev) => ({
                        ...prev,
                        district: "",
                        area: "",
                        detailedAddress: "",
                        landmark: "",
                      }));
                      setPreview(null);
                    }}
                    className={`cursor-pointer rounded-2xl border border-dashed p-4 text-center flex flex-col items-center justify-center transition min-h-[110px] ${
                      selectedAddressId === null
                        ? "border-ink bg-slate-50 text-ink font-semibold"
                        : "border-slate-300 hover:border-ink text-slate-500"
                    }`}
                  >
                    <span className="text-sm">+ Use New Address</span>
                    <span className="text-[11px] text-slate-400 mt-0.5">Enter a different delivery location</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-[12px] text-ink2">
                District
                <select
                  required
                  disabled={optionsLoading}
                  value={form.district}
                  onChange={(event) => {
                    setSelectedAddressId(null);
                    updateForm("district", event.target.value);
                  }}
                  className={inputClass}
                >
                  <option value="">
                    {optionsLoading ? "Loading districts…" : "Select district"}
                  </option>
                  {districts.map((district) => (
                    <option key={district.id} value={district.name}>
                      {district.name} · {district.zoneName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[12px] text-ink2">
                Area / thana
                <input
                  required
                  minLength={2}
                  maxLength={160}
                  autoComplete="address-level2"
                  value={form.area}
                  onChange={(event) => {
                    setSelectedAddressId(null);
                    updateForm("area", event.target.value);
                  }}
                  className={inputClass}
                />
              </label>
              <label className="text-[12px] text-ink2 sm:col-span-2">
                Detailed address
                <textarea
                  required
                  minLength={5}
                  maxLength={500}
                  rows={4}
                  autoComplete="street-address"
                  placeholder="House, road, block, floor, or village details"
                  value={form.detailedAddress}
                  onChange={(event) => {
                    setSelectedAddressId(null);
                    updateForm("detailedAddress", event.target.value);
                  }}
                  className={inputClass}
                />
              </label>
              <label className="text-[12px] text-ink2 sm:col-span-2">
                Landmark <span className="text-ink2/70">(optional)</span>
                <input
                  maxLength={200}
                  placeholder="Nearby mosque, market, or recognizable place"
                  value={form.landmark}
                  onChange={(event) => {
                    setSelectedAddressId(null);
                    updateForm("landmark", event.target.value);
                  }}
                  className={inputClass}
                />
              </label>

              {/* Save Address to Account toggle if logged in and using custom address */}
              {userLoggedIn && selectedAddressId === null && (
                <div className="sm:col-span-2 pt-1">
                  <label className="flex items-center gap-2.5 text-[12px] text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveAddressToAccount}
                      onChange={(e) => setSaveAddressToAccount(e.target.checked)}
                      className="rounded border-line text-ink focus:ring-ink"
                    />
                    <span>Save this address to my account for future fast checkout</span>
                  </label>
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-[12px] uppercase tracking-eyebrow text-ink2">Payment method</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className={`rounded-card border p-4 ${form.paymentMethod === "COD" ? "border-ink" : "border-line"}`}>
                <input type="radio" name="paymentMethod" checked={form.paymentMethod === "COD"} onChange={() => updateForm("paymentMethod", "COD")} />
                <span className="ml-3 text-[13px] font-medium text-ink">Cash on delivery</span>
                <p className="ml-6 mt-1 text-[11px] text-ink2">Pay when your parcel arrives.</p>
              </label>
              <label className={`rounded-card border p-4 ${form.paymentMethod === "PREPAID" ? "border-ink" : "border-line"} ${!paymentOptions?.methods.prepaid ? "opacity-50" : ""}`}>
                <input type="radio" name="paymentMethod" disabled={!paymentOptions?.methods.prepaid} checked={form.paymentMethod === "PREPAID"} onChange={() => updateForm("paymentMethod", "PREPAID")} />
                <span className="ml-3 text-[13px] font-medium text-ink">Pay online</span>
                <p className="ml-6 mt-1 text-[11px] text-ink2">Cards, mobile banking, or internet banking.</p>
              </label>
            </div>
            {form.paymentMethod === "PREPAID" && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {paymentOptions?.providers.map((provider) => (
                  <label key={provider.code} className={`rounded-card border px-4 py-3 text-[13px] ${form.paymentProvider === provider.code ? "border-ink" : "border-line"} ${!provider.configured ? "opacity-50" : ""}`}>
                    <input type="radio" name="paymentProvider" disabled={!provider.configured} checked={form.paymentProvider === provider.code} onChange={() => updateForm("paymentProvider", provider.code)} />
                    <span className="ml-3">{provider.name}</span>
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3 border-t border-line pt-6">
            <label className="flex items-start gap-3 text-[13px] leading-5 text-ink2">
              <input
                type="checkbox"
                checked={form.marketingConsent}
                onChange={(event) =>
                  updateForm("marketingConsent", event.target.checked)
                }
                className="mt-1"
              />
              Send me occasional product news and offers. This is optional and
              separate from order communication.
            </label>
            <label className="flex items-start gap-3 text-[13px] leading-5 text-ink2">
              <input
                type="checkbox"
                checked={form.purchaseActivityConsent}
                onChange={(event) => updateForm("purchaseActivityConsent", event.target.checked)}
                className="mt-1"
              />
              Allow this purchase to appear as anonymized recent activity after delivery. A masked name, ordered products, and optionally district or local area may be shown; contact and detailed address stay private.
            </label>
            <label className="flex items-start gap-3 text-[13px] leading-5 text-ink">
              <input
                required
                type="checkbox"
                checked={form.termsAccepted}
                onChange={(event) =>
                  updateForm("termsAccepted", event.target.checked)
                }
                className="mt-1"
              />
              <span>
                I confirm that the contact and delivery details are correct and
                agree to the current{" "}
                <Link
                  href="/policies"
                  target="_blank"
                  className="underline decoration-line underline-offset-4"
                >
                  order terms and policies
                </Link>
                .
              </span>
            </label>
          </section>

          {(error || cartError) && (
            <p role="alert" className="text-[13px] text-rose-700">
              {error || cartError}
            </p>
          )}
          <button
            disabled={previewing || optionsLoading || districts.length === 0}
            className="rounded-full bg-ink px-7 py-3 text-[14px] font-medium text-white disabled:opacity-40"
          >
            {previewing ? "Revalidating cart…" : "Calculate final total"}
          </button>
        </form>

        <aside className="h-fit rounded-card border border-line p-6 lg:sticky lg:top-8">
          <h2 className="text-[12px] uppercase tracking-eyebrow text-ink2">
            Order summary
          </h2>
          <div className="mt-4 space-y-3 text-[13px] text-ink/80">
            {lines.map((line) => {
              const disabled = updatingVariant === line.variantId;
              return (
                <div key={line.variantId} className="border-b border-line pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between gap-5">
                    <Link href={`/products/${line.slug}`} className="font-medium text-ink hover:underline">{line.productName}</Link>
                    <span className="whitespace-nowrap">{formatTaka(line.lineTotal)}</span>
                  </div>
                  {line.condition === "SECOND_HAND" && <p className="mt-1 text-[11px] text-ink2">Second-hand · {line.conditionGrade?.replaceAll("_", " ").toLowerCase()}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <select
                      aria-label={`Variant for ${line.productName}`}
                      disabled={disabled}
                      value={line.variantId}
                      onChange={(event) => void updateVariant(line.variantId, event.target.value, line.quantity)}
                      className="min-w-0 flex-1 rounded-full border border-line bg-white px-3 py-1.5 text-[11px] text-ink outline-none focus:border-ink disabled:opacity-40"
                    >
                      {line.availableVariants.map((variant) => (
                        <option key={variant.id} value={variant.id} disabled={!variant.isActive || variant.availableStock === 0}>
                          {variant.name} · {formatTaka(variant.price)}{variant.availableStock === 0 ? " · sold out" : ""}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center rounded-full border border-line">
                      <button type="button" disabled={disabled || line.quantity <= 1} onClick={() => void updateQuantity(line.variantId, line.quantity - 1)} className="px-2.5 py-1 text-ink2 disabled:opacity-30" aria-label="Decrease quantity">−</button>
                      <span className="w-5 text-center text-[11px]">{line.quantity}</span>
                      <button type="button" disabled={disabled || line.quantity >= line.availableStock} onClick={() => void updateQuantity(line.variantId, line.quantity + 1)} className="px-2.5 py-1 text-ink2 disabled:opacity-30" aria-label="Increase quantity">+</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 space-y-2 border-t border-line pt-5 text-[13px]">
            <div className="flex justify-between text-ink2">
              <span>Subtotal</span>
              <span>{formatTaka(preview?.pricing.subtotal ?? subtotal)}</span>
            </div>
            <div className="flex justify-between text-ink2">
              <span>Delivery</span>
              <span>
                {preview
                  ? preview.pricing.deliveryFee === 0
                    ? "Free"
                    : formatTaka(preview.pricing.deliveryFee)
                  : "Calculated by district"}
              </span>
            </div>
            {preview && (
              <>
                <div className="flex justify-between text-ink2">
                  <span>Payment</span>
                  <span>{preview.paymentMethod === "COD" ? "Cash on delivery" : preview.paymentProvider === "AAMARPAY" ? "aamarPay" : "SSLCommerz"}</span>
                </div>
                <div className="flex justify-between border-t border-line pt-4 text-[17px] font-semibold text-ink">
                  <span>Final total</span>
                  <span>{formatTaka(preview.pricing.total)}</span>
                </div>
              </>
            )}
          </div>
          {preview ? (
            <div className="mt-6 rounded-card bg-surface p-4">
              <p className="text-[13px] font-medium text-ink">Total confirmed</p>
              <p className="mt-1 text-[12px] leading-5 text-ink2">
                This checkout draft is saved for recovery. Placing the order is
                idempotent, so a safe retry cannot create a duplicate order.
              </p>
            </div>
          ) : (
            <p className="mt-5 text-[12px] leading-5 text-ink2">
              Enter a covered district to receive a server-calculated final
              total. Prices and stock are checked again automatically.
            </p>
          )}
          <button
            type="button"
            disabled={!preview || placing}
            onClick={() => void placeOrder()}
            className="mt-6 w-full rounded-full bg-ink px-6 py-3 text-[14px] font-medium text-white disabled:bg-ink/20"
          >
            {placing ? "Preparing payment safely…" : form.paymentMethod === "PREPAID" ? "Continue to secure payment" : "Place cash-on-delivery order"}
          </button>
          {(support?.supportPhone || support?.supportEmail) && (
            <div className="mt-5 border-t border-line pt-5 text-[12px] leading-5 text-ink2">
              <p className="font-medium text-ink">Need help before ordering?</p>
              {support.supportPhone && <a href={`tel:${support.supportPhone}`} className="mr-3 underline decoration-line underline-offset-4">{support.supportPhone}</a>}
              {support.supportEmail && <a href={`mailto:${support.supportEmail}`} className="underline decoration-line underline-offset-4">{support.supportEmail}</a>}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
