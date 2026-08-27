"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function JoinDeliveryPage() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    nidNumber: "",
    vehicleType: "BIKE",
    operatingZone: "Dhaka Metro",
    drivingLicense: "",
    emergencyPhone: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/delivery/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Application submission failed.");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "mt-1.5 w-full rounded-card border border-line bg-paper px-4 py-2.5 text-[14px] text-ink outline-none focus:border-ink transition";

  return (
    <main className="mx-auto max-w-xl px-6 py-16 md:py-24">
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-eyebrow text-ink2">Ferio Rider Network</p>
        <h1 className="mt-3 text-[32px] md:text-[38px] font-semibold tracking-tight text-ink">
          Become a Delivery Partner
        </h1>
        <p className="mt-3 text-[14px] leading-6 text-ink2">
          Join our delivery network in Bangladesh. Flexible hours, daily deliveries, and direct payments.
        </p>
      </div>

      {submitted ? (
        <div className="rounded-card border border-emerald-200 bg-emerald-50 p-8 space-y-4">
          <h2 className="text-[20px] font-semibold text-emerald-900">
            Application Submitted Successfully
          </h2>
          <p className="text-[14px] leading-6 text-emerald-800">
            Thank you for applying, <strong className="font-medium">{form.name}</strong>. Our admin team will review your NID and details. Once approved, you will receive login details for the Ferio Rider Portal.
          </p>
          <div className="pt-4 flex gap-3">
            <Link
              href="/"
              className="rounded-full bg-ink px-6 py-2.5 text-[13px] font-medium text-white"
            >
              Back to Home
            </Link>
            <Link
              href="/delivery"
              className="rounded-full border border-line px-6 py-2.5 text-[13px] text-ink"
            >
              Delivery Coverage
            </Link>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-card border border-line bg-paper p-6 md:p-8 space-y-5"
        >
          {error && (
            <div className="rounded-card border border-rose-200 bg-rose-50 p-4 text-[13px] text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[12px] text-ink2">
              Full Name *
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Mohammad Rahim"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[12px] text-ink2">
                Phone Number *
              </label>
              <input
                required
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="01712345678"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[12px] text-ink2">
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="rider@example.com"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[12px] text-ink2">
                National ID (NID) *
              </label>
              <input
                required
                value={form.nidNumber}
                onChange={(e) => setForm({ ...form, nidNumber: e.target.value })}
                placeholder="10 or 17 digit NID"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[12px] text-ink2">
                Vehicle Type *
              </label>
              <select
                value={form.vehicleType}
                onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                className={inputClass}
              >
                <option value="BIKE">Motorcycle</option>
                <option value="BICYCLE">Bicycle</option>
                <option value="E_BIKE">E-Bike</option>
                <option value="BUS">Bus Delivery</option>
                <option value="CUSTOM">Custom Vehicle</option>
                <option value="WALK">Walking</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[12px] text-ink2">
                Preferred Operating Zone *
              </label>
              <input
                required
                value={form.operatingZone}
                onChange={(e) => setForm({ ...form, operatingZone: e.target.value })}
                placeholder="e.g. Dhaka Metro, Chittagong"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[12px] text-ink2">
                Driving License (If motorcycle)
              </label>
              <input
                value={form.drivingLicense}
                onChange={(e) => setForm({ ...form, drivingLicense: e.target.value })}
                placeholder="License number"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] text-ink2">
              Emergency Contact Phone *
            </label>
            <input
              required
              type="tel"
              value={form.emergencyPhone}
              onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })}
              placeholder="Relative or family member phone"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-ink py-3 text-[14px] font-medium text-white hover:opacity-90 transition disabled:opacity-50"
          >
            {submitting ? "Submitting Application..." : "Submit Application"}
          </button>
        </form>
      )}
    </main>
  );
}
