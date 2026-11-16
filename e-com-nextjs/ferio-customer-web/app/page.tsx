import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedStorefrontPage } from "@/lib/storefront";
import { sectionRegistry } from "@/components/storefront/registry";
import { getCategories, getProducts } from "@/lib/catalog";
import InteractiveHeroShowcaseV2 from "@/components/InteractiveHeroShowcaseV2";
import CategoryGridSection from "@/components/storefront/CategoryGridSection";
import ProductGridSection from "@/components/storefront/ProductGridSection";
import FlashSaleSection from "@/components/storefront/FlashSaleSection";
import ProductRequestBanner from "@/components/ProductRequestBanner";
import FeedbackBanner from "@/components/FeedbackBanner";

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

  // Resilient fallback if tenant database hasn't initialized storefront tables
  const [categories, products] = await Promise.all([
    getCategories().catch(() => []),
    getProducts({ limit: 4 }).catch(() => ({
      items: [],
      page: 1,
      limit: 4,
      total: 0,
      totalPages: 1,
    })),
  ]);

  return (
    <main className="min-h-screen bg-paper">
      <InteractiveHeroShowcaseV2 />
      <CategoryGridSection
        settings={{ title: "Shop by category", columns: 5, showViewAll: true }}
        data={{ categories }}
      />
      <ProductGridSection
        settings={{ title: "Featured products", columns: 4, showViewAll: true }}
        data={{ items: products.items }}
      />
      <ProductRequestBanner />
      <FeedbackBanner />
      <ProductGridSection
        settings={{ title: "Exclusive deals", columns: 4, showViewAll: true }}
        data={{ items: products.items }}
      />
      <ProductGridSection
        settings={{ title: "Latest products", columns: 4, showViewAll: true }}
        data={{ items: products.items }}
      />
      <ProductGridSection
        settings={{ title: "Best sellers", columns: 4, showViewAll: true }}
        data={{ items: products.items }}
      />
      <FlashSaleSection
        settings={{ title: "Flash sale", showViewAll: true }}
        data={{ items: products.items }}
      />
    </main>
  );
}
