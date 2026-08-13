import Link from "next/link";

export default function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: { reference?: string; status?: string; payment?: string };
}) {
  const reference = searchParams.reference?.trim();
  const confirmed = searchParams.status === "CONFIRMED";
  const paymentFailed = searchParams.payment && searchParams.payment !== "success";

  return (
    <main className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="text-[11px] uppercase tracking-eyebrow text-ink2">
        Order received
      </p>
      <h1 className="mt-3 text-[32px] font-semibold tracking-tight text-ink">
        Thank you for your order.
      </h1>
      {reference ? (
        <>
          <p className="mt-5 text-[15px] text-ink">
            Your reference is <span className="font-semibold">{reference}</span>.
          </p>
          <p className="mx-auto mt-3 max-w-lg text-[14px] leading-6 text-ink2">
            {confirmed
              ? "Your cash-on-delivery order is confirmed and stock is reserved for fulfillment."
              : "We will verify your cash-on-delivery order and delivery details before fulfillment."}
          </p>
        </>
      ) : (
        <p className="mt-5 text-[14px] text-ink2">
          The order reference is unavailable in this browser session.
        </p>
      )}
      <div className="mt-9 flex justify-center gap-3">
        {reference && paymentFailed && (
          <Link href={`/payment-retry?reference=${encodeURIComponent(reference)}`} className="rounded-full bg-ink px-6 py-3 text-[14px] font-medium text-white">Retry payment</Link>
        )}
        {reference && (
          <Link
            href={`/track?reference=${encodeURIComponent(reference)}`}
            className="rounded-full bg-ink px-6 py-3 text-[14px] font-medium text-white"
          >
            Track this order
          </Link>
        )}
        <Link
          href="/products"
          className="rounded-full border border-line px-6 py-3 text-[14px] text-ink2"
        >
          Continue shopping
        </Link>
      </div>
    </main>
  );
}
