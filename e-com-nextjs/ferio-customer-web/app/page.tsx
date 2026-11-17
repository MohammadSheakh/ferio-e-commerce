import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedStorefrontPage } from "@/lib/storefront";
import { sectionRegistry } from "@/components/storefront/registry";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const pageData = await getPublishedStorefrontPage("home").catch(() => null);
  const title =
    pageData?.seoTitle ||
    pageData?.title ||
    "Ferio — Modern Multi-Tenant Commerce";
  const description =
    pageData?.seoDescription ||
    "Curated quality products delivered nationwide Bangladesh with verified stock and genuine warranty.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

interface HomePageProps {
  searchParams?: {
    preview?: string;
  };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const isPreview = searchParams?.preview === "true";
  const pageData = await getPublishedStorefrontPage("home", isPreview).catch(() => null);

  // If schema-driven storefront configuration is available, render via registry
  if (pageData && pageData.sections && pageData.sections.length > 0) {
    const activeSections = pageData.sections
      .filter((section) => (isPreview ? true : section.enabled))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return (
      <main className="min-h-screen bg-paper">
        {/* Enterprise Live Draft Preview Bar */}
        {isPreview && (
          <aside
            aria-label="Draft Preview Bar"
            className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#111114] px-6 py-2.5 text-white"
          >
            <div className="flex items-center gap-2.5 text-[12px]">
              <span className="rounded bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                PREVIEW MODE
              </span>
              <span className="font-medium text-white/90">
                Viewing Working Draft (v{pageData.versionNumber})
              </span>
              <span className="hidden sm:inline text-white/40">•</span>
              <span className="hidden sm:inline text-[11px] text-white/70">
                Changes are not visible to live customers until published.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-[11px] font-medium text-white transition hover:bg-white/20"
              >
                Exit Preview
              </Link>
            </div>
          </aside>
        )}

        {activeSections.map((section) => {
          const Component = sectionRegistry[section.type];
          if (!Component) return null;

          // Production-grade empty state suppression on public storefront
          const isCategoryGrid = section.type === "CATEGORY_GRID";
          const hasZeroCategories =
            isCategoryGrid && (!section.data?.categories || section.data.categories.length === 0);
          const hasZeroProducts =
            !isCategoryGrid && (!section.data?.items || section.data.items.length === 0);

          if (
            !isPreview &&
            section.settings?.hideWhenEmpty &&
            (hasZeroCategories || (section.data?.items !== undefined && hasZeroProducts))
          ) {
            return null;
          }

          return (
            <Component
              key={section.id}
              settings={section.settings || {}}
              data={section.data || {}}
            />
          );
        })}
      </main>
    );
  }

  // Normal stores default to an empty storefront canvas until sections are added or provisioned
  return (
    <main className="min-h-screen bg-paper flex flex-col">
      {isPreview && (
        <aside
          aria-label="Draft Preview Bar"
          className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#111114] px-6 py-2.5 text-white"
        >
          <div className="flex items-center gap-2.5 text-[12px]">
            <span className="rounded bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
              PREVIEW MODE
            </span>
            <span className="font-medium text-white/90">
              Empty Storefront Canvas
            </span>
            <span className="hidden sm:inline text-white/40">•</span>
            <span className="hidden sm:inline text-[11px] text-white/70">
              No sections have been added yet. Add sections in Storefront Studio.
            </span>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-[11px] font-medium text-white transition hover:bg-white/20"
          >
            Exit Preview
          </Link>
        </aside>
      )}

      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center my-auto min-h-[500px]">
        <div className="max-w-md space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-surface border border-line flex items-center justify-center text-ink2">
            <svg
              className="w-6 h-6 text-ink2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h2 className="text-[20px] font-semibold text-ink tracking-tight">
            Storefront Under Construction
          </h2>
          <p className="text-[13px] text-ink2 leading-relaxed">
            Welcome! Our catalog and storefront layout are currently being prepared. Please check back soon or visit our product catalog.
          </p>
          <div className="pt-2">
            <Link
              href="/products"
              className="inline-flex rounded-full bg-ink px-5 py-2 text-[12px] font-medium text-white transition hover:opacity-85"
            >
              Browse all products →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
