"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/CartContext";
import type {
  CheckoutPreview,
  DeliveryOption,
  OrderConfirmation,
} from "@/lib/checkout";
import { formatTaka } from "@/lib/catalog";

type CheckoutForm = {
  name: string;
  phone: string;
  email: string;
  district: string;
  area: string;
  detailedAddress: string;
  landmark: string;
  marketingConsent: boolean;
  termsAccepted: boolean;
};

const emptyForm: CheckoutForm = {
  name: "",
  phone: "",
  email: "",
  district: "",
  area: "",
  detailedAddress: "",
  landmark: "",
  marketingConsent: false,
  termsAccepted: false,
};

const storageKey = "ferio_checkout_details";

export default function CheckoutPage() {
  const { cart, lines, subtotal, loading } = useCart();
  const router = useRouter();
  const [form, setForm] = useState<CheckoutForm>(emptyForm);
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

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
        const response = await fetch("/api/checkout/delivery-options", {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          data?: DeliveryOption[];
          message?: string;
        };
        if (!response.ok || !payload.data) {
          throw new Error(payload.message || "Unable to load delivery areas.");
        }
        setDeliveryOptions(payload.data);
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

  function updateForm<Key extends keyof CheckoutForm>(
    key: Key,
    value: CheckoutForm[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setPreview(null);
    setError("");
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
        idempotencyKey = window.crypto.randomUUID();
        window.sessionStorage.setItem(idempotencyStorageKey, idempotencyKey);
      }
      const response = await fetch("/api/checkout/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey }),
      });
      const payload = (await response.json()) as {
        data?: OrderConfirmation;
        message?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.message || "Unable to place your order.");
      }
      window.sessionStorage.removeItem(storageKey);
      window.sessionStorage.removeItem(idempotencyStorageKey);
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
          Confirm your address to calculate the final cash-on-delivery total.
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
              Delivery address
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-[12px] text-ink2">
                District
                <select
                  required
                  disabled={optionsLoading}
                  value={form.district}
                  onChange={(event) => updateForm("district", event.target.value)}
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
                  onChange={(event) => updateForm("area", event.target.value)}
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
                  onChange={(event) =>
                    updateForm("detailedAddress", event.target.value)
                  }
                  className={inputClass}
                />
              </label>
              <label className="text-[12px] text-ink2 sm:col-span-2">
                Landmark <span className="text-ink2/70">(optional)</span>
                <input
                  maxLength={200}
                  placeholder="Nearby mosque, market, or recognizable place"
                  value={form.landmark}
                  onChange={(event) => updateForm("landmark", event.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
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

          {error && (
            <p role="alert" className="text-[13px] text-rose-700">
              {error}
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
            {lines.map((line) => (
              <div key={line.variantId} className="flex justify-between gap-5">
                <span>
                  {line.productName} · {line.variantName} × {line.quantity}
                </span>
                <span className="whitespace-nowrap">{formatTaka(line.lineTotal)}</span>
              </div>
            ))}
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
                  <span>Cash on delivery</span>
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
            {placing ? "Placing order safely…" : "Place cash-on-delivery order"}
          </button>
        </aside>
      </div>
    </main>
  );
}
