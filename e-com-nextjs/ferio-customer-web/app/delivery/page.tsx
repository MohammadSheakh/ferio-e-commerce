import type { Metadata } from "next";
import { getPublicApi } from "@/lib/backend";
import { formatTaka } from "@/lib/catalog";

type DeliveryOption = {
  id: string;
  name: string;
  deliveryFee: number;
  freeDeliveryThreshold: number | null;
  districts: Array<{ id: string; name: string }>;
};

export const metadata: Metadata = {
  title: "Delivery Areas & Fees",
  description: "Current delivery coverage and checkout fee rules.",
};

export const dynamic = "force-dynamic";

export default async function DeliveryPage() {
  const zones = await getPublicApi<DeliveryOption[]>("/checkout/delivery-options", { cache: "no-store" }).catch(() => []);
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 md:py-24">
      <p className="text-[11px] uppercase tracking-eyebrow text-ink2">Delivery</p>
      <h1 className="mt-4 text-[38px] font-semibold tracking-tight text-ink">Areas and fees</h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-7 text-ink2">Coverage and fees come from the same rules used by checkout. Your final delivery charge is recalculated before order confirmation.</p>
      <div className="mt-12 divide-y divide-line border-y border-line">
        {zones.map((zone) => (
          <section key={zone.id} className="grid gap-4 py-8 md:grid-cols-[180px_1fr_180px]">
            <h2 className="text-[15px] font-medium text-ink">{zone.name}</h2>
            <p className="text-[13px] leading-6 text-ink2">{zone.districts.map((district) => district.name).join(", ")}</p>
            <div className="text-[12px] leading-6 text-ink2 md:text-right"><p>{zone.deliveryFee === 0 ? "Free delivery" : `${formatTaka(zone.deliveryFee)} delivery fee`}</p>{zone.freeDeliveryThreshold !== null && <p>Free from {formatTaka(zone.freeDeliveryThreshold)}</p>}</div>
          </section>
        ))}
        {zones.length === 0 && <p className="py-12 text-[13px] text-ink2">Delivery coverage is being updated. Checkout will confirm whether your district is currently supported.</p>}
      </div>
    </main>
  );
}
