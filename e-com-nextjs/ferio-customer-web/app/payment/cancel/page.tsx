"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function PaymentCancelContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") || searchParams.get("booking_id") || "";

  return (
    <main className="mx-auto max-w-xl px-6 py-20 text-center">
      <div className="flex justify-center mb-6">
        <div className="h-20 w-20 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-sm">
          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-amber-800">
        Payment Cancelled
      </p>

      <h1 className="mt-2 text-[32px] font-semibold tracking-tight text-ink">
        You cancelled the payment
      </h1>

      <p className="mt-3 text-[14px] leading-relaxed text-ink2 max-w-md mx-auto">
        Your online payment session was cancelled. Don’t worry, your items and order reservation remain safely saved.
      </p>

      {reference && (
        <div className="mt-6 rounded-card border border-amber-200 bg-amber-50/40 p-4 max-w-sm mx-auto">
          <span className="text-[12px] text-amber-800 font-medium block">Order Reference</span>
          <span className="font-mono font-semibold text-[15px] text-ink">{reference}</span>
        </div>
      )}

      <div className="mt-9 flex flex-col sm:flex-row justify-center gap-3">
        {reference ? (
          <Link
            href={`/payment-retry?reference=${encodeURIComponent(reference)}`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-[14px] font-medium text-white shadow-sm hover:opacity-90 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try Payment Again
          </Link>
        ) : (
          <Link
            href="/cart"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-[14px] font-medium text-white shadow-sm hover:opacity-90 transition"
          >
            View Shopping Cart
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

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-ink2">Loading status...</div>}>
      <PaymentCancelContent />
    </Suspense>
  );
}
