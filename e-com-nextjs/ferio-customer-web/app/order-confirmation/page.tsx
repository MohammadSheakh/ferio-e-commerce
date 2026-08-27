import Link from "next/link";

export default function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: { reference?: string; status?: string; payment?: string };
}) {
  const reference = searchParams.reference?.trim();
  const paymentState = (searchParams.payment || "").toLowerCase();
  const isSuccess = paymentState === "success";
  const isCancelled = paymentState === "cancel" || paymentState === "cancelled";
  const isFailed = paymentState === "fail" || paymentState === "failed";
  const confirmed = searchParams.status === "CONFIRMED";

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 sm:py-24 text-center">
      {/* Icon Badge */}
      <div className="flex justify-center mb-6">
        {isSuccess ? (
          <div className="h-16 w-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-sm">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : isCancelled ? (
          <div className="h-16 w-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-sm">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        ) : isFailed ? (
          <div className="h-16 w-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shadow-sm">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        ) : (
          <div className="h-16 w-16 rounded-full bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-200 shadow-sm">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Eyebrow */}
      <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-ink2">
        {isSuccess
          ? "Payment Successful"
          : isCancelled
          ? "Payment Cancelled"
          : isFailed
          ? "Payment Failed"
          : "Order Received"}
      </p>

      {/* Title */}
      <h1 className="mt-3 text-[30px] sm:text-[36px] font-semibold tracking-tight text-ink">
        {isSuccess
          ? "Thank you for your payment!"
          : isCancelled
          ? "Payment was cancelled"
          : isFailed
          ? "Payment processing failed"
          : "Thank you for your order"}
      </h1>

      {/* Reference & Subtitle */}
      {reference ? (
        <div className="mt-6 rounded-card border border-line bg-surface/50 p-6 max-w-lg mx-auto text-left space-y-3">
          <div className="flex justify-between items-center text-[13px] border-b border-line/60 pb-3">
            <span className="text-ink2 font-medium">Order Reference</span>
            <span className="font-mono font-semibold text-ink">{reference}</span>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-ink2 font-medium">Payment Status</span>
            <span
              className={`font-semibold capitalize px-2.5 py-0.5 rounded-full text-[12px] ${
                isSuccess
                  ? "bg-emerald-100 text-emerald-800"
                  : isCancelled
                  ? "bg-amber-100 text-amber-800"
                  : isFailed
                  ? "bg-rose-100 text-rose-800"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              {paymentState || (confirmed ? "Paid" : "Pending")}
            </span>
          </div>
          <p className="pt-2 text-[13px] leading-relaxed text-ink2">
            {isSuccess
              ? "Your payment was verified successfully. Your order is confirmed and currently being prepared for fulfillment."
              : isCancelled
              ? "The online payment transaction was cancelled. Your stock reservation is saved temporarily so you can retry payment."
              : isFailed
              ? "We could not verify your online transaction. Please retry payment or contact customer support if money was debited."
              : confirmed
              ? "Your order is confirmed and stock is reserved for fulfillment."
              : "We will verify your order details before fulfillment."}
          </p>
        </div>
      ) : (
        <p className="mt-5 text-[14px] text-ink2">
          The order reference is unavailable in this browser session.
        </p>
      )}

      {/* Action Buttons */}
      <div className="mt-9 flex flex-wrap justify-center gap-3">
        {(isFailed || isCancelled) && reference && (
          <Link
            href={`/payment-retry?reference=${encodeURIComponent(reference)}`}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[14px] font-medium text-white shadow-sm hover:opacity-90 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry payment
          </Link>
        )}
        {reference && (
          <Link
            href={`/track?reference=${encodeURIComponent(reference)}`}
            className="inline-flex items-center gap-2 rounded-full bg-ink/5 border border-line px-6 py-3 text-[14px] font-medium text-ink hover:bg-ink/10 transition"
          >
            Track this order
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        )}
        <Link
          href="/products"
          className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 text-[14px] text-ink2 hover:text-ink hover:border-ink transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 11h14l1 12H4L5 11z" />
          </svg>
          Continue shopping
        </Link>
      </div>
    </main>
  );
}
