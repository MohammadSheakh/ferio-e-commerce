"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function PaymentFailedContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") || searchParams.get("booking_id") || "";

  return (
    <main className="mx-auto max-w-xl px-6 py-20 text-center">
      <div className="flex justify-center mb-6">
        <div className="h-20 w-20 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shadow-sm">
          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-rose-700">
        Transaction Failed
      </p>

      <h1 className="mt-2 text-[32px] font-semibold tracking-tight text-ink">
        Payment could not be processed
      </h1>

      <p className="mt-3 text-[14px] leading-relaxed text-ink2 max-w-md mx-auto">
        Your payment attempt was declined or interrupted. No funds were debited, or any held amount will be automatically reversed by your bank.
      </p>

      {reference && (
        <div className="mt-6 rounded-card border border-rose-200 bg-rose-50/40 p-4 max-w-sm mx-auto">
          <span className="text-[12px] text-rose-800 font-medium block">Order Reference</span>
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
            Retry payment
          </Link>
        ) : (
          <Link
            href="/checkout"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-[14px] font-medium text-white shadow-sm hover:opacity-90 transition"
          >
            Return to Checkout
          </Link>
        )}
        <Link
          href="/support"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-6 py-3 text-[14px] font-medium text-ink hover:bg-surface transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Contact Support
        </Link>
      </div>
    </main>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-ink2">Loading status...</div>}>
      <PaymentFailedContent />
    </Suspense>
  );
}
