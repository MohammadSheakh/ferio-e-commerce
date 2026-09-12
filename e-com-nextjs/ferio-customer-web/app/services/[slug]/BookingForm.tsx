"use client";

import { FormEvent, useState } from "react";
import type { ServiceOffering } from "@/lib/services";
import { getErrorMessage } from "@/lib/error-message";

export default function BookingForm({ service }: { service: ServiceOffering }) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/services/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          customerName: form.get("name"),
          phone: form.get("phone"),
          email: form.get("email") || undefined,
          preferredAt: new Date(String(form.get("preferredAt"))).toISOString(),
          address: form.get("address") || undefined,
          customerNote: form.get("note") || undefined,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        data?: { reference?: string };
        message?: string;
      };
      if (!response.ok) {
        throw new Error(payload.message || "Unable to request this booking.");
      }
      setMessage(
        payload.data?.reference
          ? `Booking requested. Reference: ${payload.data.reference}`
          : "Booking requested. We will contact you shortly.",
      );
      event.currentTarget.reset();
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to request this booking."));
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "mt-1.5 w-full rounded-card border border-line px-4 py-3 text-[14px] outline-none focus:border-ink";

  return (
    <form onSubmit={submit} className="mt-8 space-y-4 border-t border-line pt-7">
      <h2 className="text-[16px] font-medium text-ink">Request a booking</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-[12px] text-ink2">
          Name
          <input name="name" required minLength={2} maxLength={120} className={inputClass} />
        </label>
        <label className="text-[12px] text-ink2">
          Phone
          <input name="phone" required maxLength={32} className={inputClass} />
        </label>
        <label className="text-[12px] text-ink2">
          Email
          <input name="email" type="email" className={inputClass} />
        </label>
        <label className="text-[12px] text-ink2">
          Preferred time
          <input name="preferredAt" required type="datetime-local" className={inputClass} />
        </label>
      </div>
      <label className="block text-[12px] text-ink2">
        Service address
        <input name="address" maxLength={500} className={inputClass} />
      </label>
      <label className="block text-[12px] text-ink2">
        Note
        <textarea name="note" rows={3} maxLength={1000} className={inputClass} />
      </label>
      {message && <p role="status" className="text-[13px] text-ink2">{message}</p>}
      <button disabled={submitting} className="rounded-full bg-ink px-6 py-3 text-[13px] text-white disabled:opacity-40">
        {submitting ? "Submitting…" : "Request booking"}
      </button>
    </form>
  );
}
