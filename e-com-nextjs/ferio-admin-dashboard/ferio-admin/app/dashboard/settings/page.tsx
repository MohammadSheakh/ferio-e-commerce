"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import type { CommerceSettings } from "@/lib/commerce-settings";

type SettingsForm = Omit<
  CommerceSettings,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "defaultReturnWindowDays"
  | "purchaseActivityEnabled"
  | "purchaseHistoryEnabled"
  | "purchaseActivityShowDistrict"
  | "purchaseActivityShowArea"
  | "purchaseActivityDurationMs"
  | "purchaseActivityIntervalSeconds"
  | "purchaseActivityMaxAgeDays"
  | "purchaseActivityExcludedProductIds"
> & { defaultReturnWindowDays: string };

function toForm(settings: CommerceSettings): SettingsForm {
  return {
    storeName: settings.storeName,
    legalName: settings.legalName,
    supportPhone: settings.supportPhone,
    supportEmail: settings.supportEmail,
    currency: settings.currency,
    timezone: settings.timezone,
    orderPrefix: settings.orderPrefix,
    defaultReturnWindowDays:
      settings.defaultReturnWindowDays === null
        ? ""
        : String(settings.defaultReturnWindowDays),
    codEnabled: settings.codEnabled,
    prepaidEnabled: settings.prepaidEnabled,
    categoryTopNavEnabled: settings.categoryTopNavEnabled ?? true,
    categorySideNavEnabled: settings.categorySideNavEnabled ?? true,
    termsUrl: settings.termsUrl,
    privacyUrl: settings.privacyUrl,
    returnPolicyUrl: settings.returnPolicyUrl,
  };
}

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/commerce-settings", {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          data?: CommerceSettings;
          message?: string;
        };
        if (!response.ok || !payload.data) {
          throw new Error(payload.message || "Unable to load settings.");
        }
        setForm(toForm(payload.data));
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load settings.",
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/commerce-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          legalName: form.legalName || null,
          supportPhone: form.supportPhone || null,
          supportEmail: form.supportEmail || null,
          defaultReturnWindowDays: form.defaultReturnWindowDays
            ? Number(form.defaultReturnWindowDays)
            : null,
          termsUrl: form.termsUrl || null,
          privacyUrl: form.privacyUrl || null,
          returnPolicyUrl: form.returnPolicyUrl || null,
        }),
      });
      const payload = (await response.json()) as {
        data?: CommerceSettings;
        message?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.message || "Unable to save settings.");
      }
      setForm(toForm(payload.data));
      setMessage("Settings saved and recorded in audit history.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "mt-1.5 w-full rounded-card border border-line px-3.5 py-2.5 text-[14px] outline-none focus:border-ink disabled:bg-surface disabled:text-ink2";
  const set = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));

  return (
    <>
      <Topbar
        title="Settings"
        subtitle="Store identity, checkout availability, and policy defaults"
      />
      <main className="p-8">
        {loading && (
          <p className="py-16 text-center text-[13px] text-ink2">
            Loading settings…
          </p>
        )}
        {!loading && !form && (
          <p role="alert" className="py-16 text-center text-[13px] text-rose-700">
            {error || "Settings are unavailable."}
          </p>
        )}
        {form && (
          <form onSubmit={save} className="mx-auto max-w-5xl space-y-10">
            <section className="border-b border-line pb-10">
              <div className="mb-5">
                <h2 className="text-[17px] font-medium text-ink">Store identity</h2>
                <p className="mt-1 text-[12px] text-ink2">
                  Customer-facing name and operational contact details.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-[12px] text-ink2">
                  Store name
                  <input required minLength={2} maxLength={100} value={form.storeName} onChange={(event) => set("storeName", event.target.value)} className={inputClass} />
                </label>
                <label className="text-[12px] text-ink2">
                  Legal name
                  <input maxLength={160} value={form.legalName ?? ""} onChange={(event) => set("legalName", event.target.value)} className={inputClass} />
                </label>
                <label className="text-[12px] text-ink2">
                  Support phone
                  <input type="tel" maxLength={24} placeholder="+8801712345678" value={form.supportPhone ?? ""} onChange={(event) => set("supportPhone", event.target.value)} className={inputClass} />
                </label>
                <label className="text-[12px] text-ink2">
                  Support email
                  <input type="email" maxLength={160} value={form.supportEmail ?? ""} onChange={(event) => set("supportEmail", event.target.value)} className={inputClass} />
                </label>
              </div>
            </section>

            <section className="border-b border-line pb-10">
              <div className="mb-5">
                <h2 className="text-[17px] font-medium text-ink">Commerce defaults</h2>
                <p className="mt-1 text-[12px] text-ink2">
                  Prefix changes affect future orders only. Prices remain integer paisa.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-[12px] text-ink2">
                  Currency
                  <select value={form.currency} disabled className={inputClass}>
                    <option value="BDT">BDT — Bangladeshi taka</option>
                  </select>
                </label>
                <label className="text-[12px] text-ink2">
                  Timezone
                  <input required value={form.timezone} onChange={(event) => set("timezone", event.target.value)} placeholder="Asia/Dhaka" className={inputClass} />
                </label>
                <label className="text-[12px] text-ink2">
                  Order prefix
                  <input required minLength={2} maxLength={8} pattern="[A-Za-z0-9-]+" value={form.orderPrefix} onChange={(event) => set("orderPrefix", event.target.value.toUpperCase())} className={inputClass} />
                </label>
              </div>
            </section>

            <section className="border-b border-line pb-10">
              <div className="mb-5">
                <h2 className="text-[17px] font-medium text-ink">Checkout and returns</h2>
                <p className="mt-1 text-[12px] text-ink2">
                  Payment availability is enforced by checkout and order creation.
                </p>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <label className="flex items-start gap-3 text-[13px] text-ink">
                  <input type="checkbox" checked={form.codEnabled} onChange={(event) => set("codEnabled", event.target.checked)} className="mt-0.5" />
                  <span>Cash on delivery<span className="mt-0.5 block text-[11px] text-ink2">Allow COD checkout previews and new orders.</span></span>
                </label>
                <label className="flex items-start gap-3 text-[13px] text-ink cursor-pointer select-none">
                  <input type="checkbox" checked={form.prepaidEnabled} onChange={(event) => set("prepaidEnabled", event.target.checked)} className="mt-0.5" />
                  <span>Prepaid payments<span className="mt-0.5 block text-[11px] text-ink2">Allow online prepaid checkout (SSLCommerz / aamarPay).</span></span>
                </label>
                <label className="text-[12px] text-ink2">
                  Default return window (days)
                  <input type="number" min="0" max="365" value={form.defaultReturnWindowDays} onChange={(event) => set("defaultReturnWindowDays", event.target.value)} placeholder="Awaiting policy approval" className={inputClass} />
                </label>
                <div className="flex items-end gap-4 pb-2 text-[12px]">
                  <Link href="/dashboard/orders" className="text-ink2 underline decoration-line underline-offset-4 hover:text-ink">COD verification</Link>
                  <Link href="/dashboard/delivery" className="text-ink2 underline decoration-line underline-offset-4 hover:text-ink">Delivery regions and fees</Link>
                </div>
              </div>
            </section>

            <section className="border-b border-line pb-10">
              <div className="mb-5">
                <h2 className="text-[17px] font-medium text-ink">Category Navigation Layouts</h2>
                <p className="mt-1 text-[12px] text-ink2">
                  Select which category navigation design(s) are active on the customer website. You can enable either or both simultaneously.
                </p>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <label className="flex items-start gap-3 text-[13px] font-medium text-ink cursor-pointer select-none rounded-card border border-line p-4 transition hover:border-ink">
                  <input
                    type="checkbox"
                    checked={form.categoryTopNavEnabled}
                    onChange={(event) => set("categoryTopNavEnabled", event.target.checked)}
                    className="mt-1 h-4 w-4 accent-ink"
                  />
                  <div>
                    <span className="font-semibold text-ink">Top Header Category Bar</span>
                    <span className="mt-1 block text-[12px] font-normal text-ink2">
                      Multi-level horizontal dropdown menu displayed directly below the main header bar.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 text-[13px] font-medium text-ink cursor-pointer select-none rounded-card border border-line p-4 transition hover:border-ink">
                  <input
                    type="checkbox"
                    checked={form.categorySideNavEnabled}
                    onChange={(event) => set("categorySideNavEnabled", event.target.checked)}
                    className="mt-1 h-4 w-4 accent-ink"
                  />
                  <div>
                    <span className="font-semibold text-ink">Side Panel Category Navigation</span>
                    <span className="mt-1 block text-[12px] font-normal text-ink2">
                      Vertical collapsible sidebar drawer & panel displaying root categories, expandable accordions, and thumbnail grid cards.
                    </span>
                  </div>
                </label>
              </div>
            </section>

            <section>
              <div className="mb-5">
                <h2 className="text-[17px] font-medium text-ink">Policy links</h2>
                <p className="mt-1 text-[12px] text-ink2">Only absolute HTTPS or HTTP links are accepted.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {([['termsUrl', 'Terms URL'], ['privacyUrl', 'Privacy URL'], ['returnPolicyUrl', 'Return policy URL']] as const).map(([key, label]) => (
                  <label key={key} className="text-[12px] text-ink2">
                    {label}
                    <input type="url" value={form[key] ?? ""} onChange={(event) => set(key, event.target.value)} placeholder="https://" className={inputClass} />
                  </label>
                ))}
              </div>
            </section>

            {(error || message) && (
              <p role={error ? "alert" : "status"} className={`text-[12px] ${error ? "text-rose-700" : "text-emerald-700"}`}>
                {error || message}
              </p>
            )}
            <button disabled={saving} className="rounded-full bg-ink px-6 py-2.5 text-[13px] font-medium text-white disabled:opacity-50">
              {saving ? "Saving…" : "Save settings"}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
