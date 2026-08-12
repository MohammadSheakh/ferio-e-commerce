"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import { formatTaka } from "@/lib/catalog";
import type { DeliveryZone } from "@/lib/delivery";

type DeliveryForm = {
  id?: string;
  name: string;
  districts: string;
  deliveryFee: string;
  freeDeliveryThreshold: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm: DeliveryForm = {
  name: "",
  districts: "",
  deliveryFee: "",
  freeDeliveryThreshold: "",
  sortOrder: "0",
  isActive: true,
};

export default function DeliveryPage() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [form, setForm] = useState<DeliveryForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadZones = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/delivery-zones", { cache: "no-store" });
      const payload = (await response.json()) as {
        data?: DeliveryZone[];
        message?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.message || "Unable to load delivery zones.");
      }
      setZones(payload.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load delivery zones.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadZones();
  }, [loadZones]);

  async function saveZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const districts = form.districts
        .split(/[,\n]/)
        .map((district) => district.trim())
        .filter(Boolean);
      const response = await fetch(
        form.id ? `/api/delivery-zones/${form.id}` : "/api/delivery-zones",
        {
          method: form.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            districts,
            deliveryFee: Math.round(Number(form.deliveryFee) * 100),
            freeDeliveryThreshold: form.freeDeliveryThreshold
              ? Math.round(Number(form.freeDeliveryThreshold) * 100)
              : null,
            sortOrder: Number(form.sortOrder),
            isActive: form.isActive,
          }),
        },
      );
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "Unable to save delivery zone.");
      }
      setForm(emptyForm);
      await loadZones();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save delivery zone.",
      );
    } finally {
      setSaving(false);
    }
  }

  function editZone(zone: DeliveryZone) {
    setForm({
      id: zone.id,
      name: zone.name,
      districts: zone.districts.map((district) => district.name).join("\n"),
      deliveryFee: String(zone.deliveryFee / 100),
      freeDeliveryThreshold:
        zone.freeDeliveryThreshold === null
          ? ""
          : String(zone.freeDeliveryThreshold / 100),
      sortOrder: String(zone.sortOrder),
      isActive: zone.isActive,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const inputClass =
    "mt-1.5 w-full rounded-card border border-line px-3.5 py-2.5 text-[14px] outline-none focus:border-ink";

  return (
    <>
      <Topbar
        title="Delivery"
        subtitle="Configure district coverage, fees, and free-delivery thresholds"
      />
      <div className="grid gap-8 p-8 xl:grid-cols-[380px_1fr]">
        <form
          onSubmit={saveZone}
          className="h-fit space-y-4 rounded-card border border-line p-5"
        >
          <div>
            <h2 className="text-[16px] font-medium text-ink">
              {form.id ? "Edit delivery zone" : "Add delivery zone"}
            </h2>
            <p className="mt-1 text-[12px] text-ink2">
              Money is entered in taka and stored as integer paisa.
            </p>
          </div>
          <label className="block text-[12px] text-ink2">
            Zone name
            <input
              required
              minLength={2}
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="block text-[12px] text-ink2">
            Districts
            <textarea
              required
              rows={7}
              value={form.districts}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  districts: event.target.value,
                }))
              }
              placeholder="One district per line"
              className={inputClass}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-[12px] text-ink2">
              Delivery fee (৳)
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.deliveryFee}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    deliveryFee: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </label>
            <label className="block text-[12px] text-ink2">
              Free above (৳)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.freeDeliveryThreshold}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    freeDeliveryThreshold: event.target.value,
                  }))
                }
                placeholder="Never"
                className={inputClass}
              />
            </label>
          </div>
          <label className="block text-[12px] text-ink2">
            Sort order
            <input
              type="number"
              min="0"
              value={form.sortOrder}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  sortOrder: event.target.value,
                }))
              }
              className={inputClass}
            />
          </label>
          <label className="flex items-center gap-2 text-[13px] text-ink">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isActive: event.target.checked,
                }))
              }
            />
            Available at checkout
          </label>
          {error && (
            <p role="alert" className="text-[12px] text-rose-700">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              disabled={saving}
              className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : form.id ? "Save changes" : "Create zone"}
            </button>
            {form.id && (
              <button
                type="button"
                onClick={() => setForm(emptyForm)}
                className="rounded-full border border-line px-4 py-2.5 text-[13px] text-ink2"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-eyebrow text-ink2">
                <th className="px-5 py-3 font-normal">Zone</th>
                <th className="px-5 py-3 font-normal">Districts</th>
                <th className="px-5 py-3 font-normal">Fee</th>
                <th className="px-5 py-3 font-normal">Free above</th>
                <th className="px-5 py-3 font-normal">Status</th>
                <th className="px-5 py-3 font-normal">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {zones.map((zone) => (
                <tr key={zone.id} className="text-[13px]">
                  <td className="px-5 py-3.5">
                    <p className="text-ink">{zone.name}</p>
                    <p className="text-[11px] text-ink2">Order {zone.sortOrder}</p>
                  </td>
                  <td className="max-w-xs px-5 py-3.5 text-[12px] leading-5 text-ink2">
                    {zone.districts.map((district) => district.name).join(", ")}
                  </td>
                  <td className="px-5 py-3.5 text-ink">{formatTaka(zone.deliveryFee)}</td>
                  <td className="px-5 py-3.5 text-ink2">
                    {zone.freeDeliveryThreshold === null
                      ? "—"
                      : formatTaka(zone.freeDeliveryThreshold)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] ${
                        zone.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-surface text-ink2"
                      }`}
                    >
                      {zone.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => editZone(zone)}
                      className="text-[12px] text-ink2 underline decoration-line underline-offset-4 hover:text-ink"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && zones.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-[13px] text-ink2">
                    Create a delivery zone before opening checkout.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-[13px] text-ink2">
                    Loading delivery zones…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
