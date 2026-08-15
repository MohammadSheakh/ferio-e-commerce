import Link from "next/link";
import type { PublicStoreConfig } from "@/lib/store";

export default function Footer({ store }: { store: PublicStoreConfig }) {
  return (
    <footer className="mt-24 border-t border-line bg-paper">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-3">
        <div>
          <p className="text-[19px] font-semibold text-ink">{store.storeName}</p>
          <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-ink2">
            Current products, clear checkout totals, and order tracking in one place.
          </p>
          {store.legalName && (
            <p className="mt-3 text-[11px] text-ink2">{store.legalName}</p>
          )}
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-eyebrow text-ink2">Support</p>
          <ul className="mt-4 space-y-2.5 text-[13px] text-ink/80">
            <li><Link href="/track" className="hover:text-ink">Track an order</Link></li>
            <li><Link href="/account/orders" className="hover:text-ink">Your orders</Link></li>
            <li><Link href="/account/register" className="hover:text-ink">Create account</Link></li>
            <li><Link href="/support" className="hover:text-ink">Contact support</Link></li>
            <li><Link href="/delivery" className="hover:text-ink">Delivery areas and fees</Link></li>
            {store.purchaseHistoryEnabled && <li><Link href="/purchase-history" className="hover:text-ink">Recent verified purchases</Link></li>}
            <li><Link href="/policies" className="hover:text-ink">Terms, privacy, and returns</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-eyebrow text-ink2">Contact</p>
          <div className="mt-4 space-y-2.5 text-[13px] text-ink/80">
            {store.supportPhone && <p><a href={`tel:${store.supportPhone}`} className="hover:text-ink">{store.supportPhone}</a></p>}
            {store.supportEmail && <p><a href={`mailto:${store.supportEmail}`} className="hover:text-ink">{store.supportEmail}</a></p>}
            {!store.supportPhone && !store.supportEmail && <p className="text-ink2">Support contacts are being updated.</p>}
            <p className="pt-2 text-[11px] text-ink2">Payment availability is confirmed during checkout.</p>
          </div>
        </div>
      </div>

      {/* Oversized ferio signature cropped and blurred into the footer baseline */}
      <div className="relative mt-8 h-[clamp(5.5rem,11.5vw,12rem)] overflow-hidden bg-[#111] text-center">
        <div
          className="absolute inset-x-0 -bottom-[0.12em] whitespace-nowrap text-[clamp(4.6rem,10.8vw,12rem)] font-semibold leading-[0.82] tracking-[-0.08em] text-white select-none pointer-events-none"
          style={{
            fontFamily: "var(--font-space-grotesk), Arial, sans-serif",
          }}
        >
          f e r i o
        </div>

        {/* Copyright notice positioned in bottom-right corner in white text color */}
        <div className="absolute bottom-3 right-5 z-10 text-[11px] font-medium text-white/90 drop-shadow-md">
          © 2026-{new Date().getFullYear() + 1} {store.storeName}. All rights reserved.
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[18%] bg-gradient-to-b from-transparent to-[#111]/25 backdrop-blur-[3px] [mask-image:linear-gradient(to_bottom,transparent,black)]" />
      </div>
    </footer>
  );
}
