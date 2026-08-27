"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") || searchParams.get("booking_id") || "";

  return (
    <main className="mx-auto max-w-xl px-6 py-20 text-center">
      <div className="flex justify-center mb-6">
        <div className="h-20 w-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-sm">
          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-emerald-800">
        Payment Verified
      </p>

      <h1 className="mt-2 text-[32px] font-semibold tracking-tight text-ink">
        Payment Completed Successfully
      </h1>

      <p className="mt-3 text-[14px] leading-relaxed text-ink2 max-w-md mx-auto">
        Your payment has been received and verified. Your order is now confirmed and sent to our warehouse for packing and shipment.
      </p>

      {reference && (
        <div className="mt-6 rounded-card border border-emerald-200 bg-emerald-50/40 p-4 max-w-sm mx-auto">
          <span className="text-[12px] text-emerald-800 font-medium block">Order Reference</span>
          <span className="font-mono font-semibold text-[15px] text-ink">{reference}</span>
        </div>
      )}

      <div className="mt-9 flex flex-col sm:flex-row justify-center gap-3">
        {reference && (
          <Link
            href={`/track?reference=${encodeURIComponent(reference)}`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-[14px] font-medium text-white shadow-sm hover:opacity-90 transition"
          >
            Track Order Status
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        )}
        <Link
          href="/products"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-6 py-3 text-[14px] text-ink2 hover:text-ink transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 11h14l1 12H4L5 11z" />
          </svg>
          Continue Shopping
        </Link>
      </div>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-ink2">Loading status...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
