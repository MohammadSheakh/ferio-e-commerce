import type { Metadata } from "next";
import { fallbackStoreConfig, getStoreConfig } from "@/lib/store";

export const metadata: Metadata = {
  title: "Terms, Privacy & Returns",
  description: "Current store policy references and return-window information.",
};

export const dynamic = "force-dynamic";

export default async function PoliciesPage() {
  const store = await getStoreConfig().catch(() => fallbackStoreConfig);
  const policies = [
    { id: "terms", label: "Terms and conditions", url: store.termsUrl },
    { id: "privacy", label: "Privacy policy", url: store.privacyUrl },
    { id: "returns", label: "Return and exchange policy", url: store.returnPolicyUrl },
  ];
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 md:py-24">
      <p className="text-[11px] uppercase tracking-eyebrow text-ink2">Store policies</p>
      <h1 className="mt-4 text-[38px] font-semibold tracking-tight text-ink">Terms, privacy, and returns</h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-7 text-ink2">This page links to the current approved policy documents configured by the store administrator. It does not replace those documents.</p>

      <div className="mt-12 divide-y divide-line border-y border-line">
        {policies.map((policy) => (
          <section id={policy.id} key={policy.id} className="grid gap-3 py-8 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <h2 className="text-[16px] font-medium text-ink">{policy.label}</h2>
              {policy.id === "returns" && <p className="mt-2 text-[12px] leading-5 text-ink2">{store.defaultReturnWindowDays === null ? "The default return window is awaiting approval. Product-specific terms may apply." : `The configured default return window is ${store.defaultReturnWindowDays} days. Product or category exceptions may apply.`}</p>}
              {!policy.url && <p className="mt-2 text-[12px] text-ink2">An approved document has not been published yet. Contact support before ordering if you need clarification.</p>}
            </div>
            {policy.url && <a href={policy.url} target="_blank" rel="noreferrer" className="text-[13px] text-ink underline decoration-line underline-offset-4">Open current document</a>}
          </section>
        ))}
      </div>
    </main>
  );
}
