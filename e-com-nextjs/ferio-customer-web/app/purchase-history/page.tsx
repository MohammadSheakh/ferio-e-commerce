import type { Metadata } from "next";
import Link from "next/link";
import { getPurchaseActivity, relativePurchaseTime } from "@/lib/purchase-activity";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Recent verified purchases",
  description: "Privacy-safe activity from customers who opted in after a completed purchase.",
};

export default async function PurchaseHistoryPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const requestedPage = Number(searchParams.page || 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const activity = await getPurchaseActivity(page, 12).catch(() => null);

  return (
    <main className="mx-auto min-h-[60vh] max-w-6xl px-6 py-14">
      <p className="text-[11px] uppercase tracking-eyebrow text-ink2">Real customer activity</p>
      <h1 className="mt-2 text-[30px] font-semibold tracking-tight text-ink">Recent verified purchases</h1>
      <p className="mt-3 max-w-2xl text-[13px] leading-6 text-ink2">
        Only delivered or completed orders from customers who explicitly opted in appear here. Names are masked and contact or address details are never shown.
      </p>

      {!activity?.settings.historyEnabled ? (
        <p className="mt-16 border-t border-line py-12 text-[13px] text-ink2">Public purchase history is not currently available.</p>
      ) : activity.items.length ? (
        <>
          <div className="mt-10 divide-y divide-line border-y border-line">
            {activity.items.map((item) => (
              <article key={item.id} className="flex gap-4 py-5">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-card bg-surface">
                  {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-eyebrow text-ink2">Verified purchase</p>
                  <h2 className="mt-1 text-[15px] font-medium text-ink">{item.customerName} ordered {item.productName}{item.additionalItemCount > 0 ? ` +${item.additionalItemCount} ${item.additionalItemCount === 1 ? "item" : "items"}` : ""}{item.location ? ` from ${item.location}` : ""}</h2>
                  <p className="mt-1 text-[12px] text-ink2">{item.variantName}</p>
                  <p className="mt-2 text-[11px] text-ink2">{relativePurchaseTime(item.purchasedAt)}</p>
                </div>
              </article>
            ))}
          </div>
          <nav aria-label="Purchase history pages" className="mt-8 flex items-center justify-between text-[13px]">
            {activity.page > 1 ? <Link href={`/purchase-history?page=${activity.page - 1}`} className="underline underline-offset-4">Previous</Link> : <span />}
            <span className="text-ink2">Page {activity.page} of {activity.totalPages}</span>
            {activity.page < activity.totalPages ? <Link href={`/purchase-history?page=${activity.page + 1}`} className="underline underline-offset-4">Next</Link> : <span />}
          </nav>
        </>
      ) : (
        <p className="mt-16 border-t border-line py-12 text-[13px] text-ink2">No opted-in completed purchases are available yet.</p>
      )}
    </main>
  );
}
