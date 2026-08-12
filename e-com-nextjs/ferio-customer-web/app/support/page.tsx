import type { Metadata } from "next";
import Link from "next/link";
import { fallbackStoreConfig, getStoreConfig } from "@/lib/store";

export const metadata: Metadata = {
  title: "Support",
  description: "Order help and verified support contacts.",
};

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const store = await getStoreConfig().catch(() => fallbackStoreConfig);
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 md:py-24">
      <p className="text-[11px] uppercase tracking-eyebrow text-ink2">Support</p>
      <h1 className="mt-4 text-[38px] font-semibold tracking-tight text-ink">How can we help?</h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-7 text-ink2">Track an existing order first. For address, delivery, cancellation, or return questions, include your order reference when contacting support.</p>

      <section className="mt-12 grid gap-8 border-y border-line py-10 md:grid-cols-2">
        <div>
          <h2 className="text-[16px] font-medium text-ink">Track an order</h2>
          <p className="mt-2 text-[13px] leading-6 text-ink2">Use the order reference and the phone number entered during checkout.</p>
          <Link href="/track" className="mt-5 inline-flex rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-white">Track order</Link>
        </div>
        <div>
          <h2 className="text-[16px] font-medium text-ink">Contact support</h2>
          <div className="mt-3 space-y-2 text-[13px] text-ink2">
            {store.supportPhone && <p>Phone: <a href={`tel:${store.supportPhone}`} className="text-ink underline decoration-line underline-offset-4">{store.supportPhone}</a></p>}
            {store.supportEmail && <p>Email: <a href={`mailto:${store.supportEmail}`} className="text-ink underline decoration-line underline-offset-4">{store.supportEmail}</a></p>}
            {!store.supportPhone && !store.supportEmail && <p>Verified support contacts have not been published yet. You can still track your order online.</p>}
          </div>
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-5 text-[13px] text-ink2">
        <Link href="/delivery" className="underline decoration-line underline-offset-4 hover:text-ink">Delivery areas and fees</Link>
        <Link href="/policies" className="underline decoration-line underline-offset-4 hover:text-ink">Terms, privacy, and returns</Link>
      </div>
    </main>
  );
}
