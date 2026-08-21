"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";

type Eligibility = {
  generatedAt: string;
  policy: { minimumAgeHours: number; consentMaxAgeDays: number };
  items: Array<{
    id: string;
    updatedAt: string;
    expiresAt: string;
    user: { id: string; name: string; email: string };
    checkoutDraft: { marketingConsentAt: string; subtotal: number };
    items: Array<{
      quantity: number;
      variant: { product: { name: string }; name: string; price: number };
    }>;
  }>;
};

export default function AbandonedCartsPage() {
  const [data, setData] = useState<Eligibility | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/abandoned-carts", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as {
          data?: Eligibility;
          message?: string;
        };
        if (!response.ok || !payload.data) {
          throw new Error(payload.message || "Unable to load eligibility.");
        }
        setData(payload.data);
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Unable to load eligibility."),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Topbar
        title="Abandoned carts"
        subtitle="Verified customers with current email consent"
      />
      <div className="space-y-6 p-8">
        <section className="border-b border-line pb-5">
          <h2 className="text-[16px] font-medium text-ink">Eligibility queue</h2>
          <p className="mt-1 text-[12px] leading-5 text-ink2">
            Read-only evidence. This screen does not send messages or create campaigns.
            {data
              ? ` Carts must be inactive for ${data.policy.minimumAgeHours} hours and consent must be newer than ${data.policy.consentMaxAgeDays} days.`
              : ""}
          </p>
        </section>
        {error && <p role="alert" className="text-[13px] text-rose-700">{error}</p>}
        <div className="overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[760px] text-left">
            <thead><tr className="text-[11px] uppercase tracking-eyebrow text-ink2"><th className="px-5 py-3 font-normal">Customer</th><th className="px-5 py-3 font-normal">Cart</th><th className="px-5 py-3 font-normal">Inactive since</th><th className="px-5 py-3 font-normal">Consent evidence</th></tr></thead>
            <tbody className="divide-y divide-line">
              {data?.items.map((cart) => <tr key={cart.id} className="align-top text-[13px]"><td className="px-5 py-4"><p className="font-medium text-ink">{cart.user.name}</p><p className="mt-0.5 text-[11px] text-ink2">{cart.user.email}</p></td><td className="px-5 py-4"><p className="text-ink">{cart.items.reduce((sum, item) => sum + item.quantity, 0)} items</p><p className="mt-0.5 max-w-xs truncate text-[11px] text-ink2">{cart.items.map((item) => item.variant.product.name).join(", ")}</p></td><td className="px-5 py-4 text-ink2">{new Date(cart.updatedAt).toLocaleString("en-BD")}</td><td className="px-5 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-700">Email consent recorded</span><p className="mt-2 text-[11px] text-ink2">{new Date(cart.checkoutDraft.marketingConsentAt).toLocaleString("en-BD")}</p></td></tr>)}
              {!loading && data?.items.length === 0 && <tr><td colSpan={4} className="px-5 py-14 text-center text-[13px] text-ink2">No carts currently meet every eligibility rule.</td></tr>}
              {loading && <tr><td colSpan={4} className="px-5 py-14 text-center text-[13px] text-ink2">Checking eligibility…</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
