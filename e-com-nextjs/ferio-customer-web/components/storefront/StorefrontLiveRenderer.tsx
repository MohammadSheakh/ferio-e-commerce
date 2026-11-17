"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { sectionRegistry } from "./registry";
import { StorefrontSectionData, StorefrontSectionType } from "@/lib/storefront";
import { CatalogCategory, CatalogProduct } from "@/lib/catalog";

const MOCK_CATEGORIES: CatalogCategory[] = [
  { id: "mock-cat-1", name: "Living Room", slug: "living-room", description: "Modern seating and tables", _count: { products: 14 } },
  { id: "mock-cat-2", name: "Bedroom", slug: "bedroom", description: "Beds, dressers and accents", _count: { products: 9 } },
  { id: "mock-cat-3", name: "Dining & Kitchen", slug: "dining", description: "Tables and kitchenware", _count: { products: 12 } },
  { id: "mock-cat-4", name: "Work & Lighting", slug: "lighting", description: "Desks and ambient lighting", _count: { products: 8 } },
  { id: "mock-cat-5", name: "Accessories", slug: "accessories", description: "Rugs, mirrors and ceramics", _count: { products: 22 } },
];

const MOCK_PRODUCTS: CatalogProduct[] = [
  {
    id: "mock-prod-1",
    slug: "minimal-velvet-armchair",
    name: "Minimalist Velvet Armchair",
    price: 18500,
    compareAtPrice: 22000,
    availableStock: 5,
    condition: "NEW",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80",
    category: { id: "mock-cat-1", name: "Living Room", slug: "living-room", description: null },
  },
  {
    id: "mock-prod-2",
    slug: "solid-oak-coffee-table",
    name: "Solid Oak Low Coffee Table",
    price: 12400,
    compareAtPrice: null,
    availableStock: 8,
    condition: "NEW",
    image: "https://images.unsplash.com/photo-1533090161767-e6ffed986b88?auto=format&fit=crop&w=600&q=80",
    category: { id: "mock-cat-1", name: "Living Room", slug: "living-room", description: null },
  },
  {
    id: "mock-prod-3",
    slug: "ceramic-ambient-floor-lamp",
    name: "Ceramic Ambient Floor Lamp",
    price: 6800,
    compareAtPrice: 8500,
    availableStock: 12,
    condition: "NEW",
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=80",
    category: { id: "mock-cat-4", name: "Work & Lighting", slug: "lighting", description: null },
  },
  {
    id: "mock-prod-4",
    slug: "textured-wool-area-rug",
    name: "Handwoven Textured Wool Rug",
    price: 15200,
    compareAtPrice: 17900,
    availableStock: 4,
    condition: "NEW",
    image: "https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=600&q=80",
    category: { id: "mock-cat-5", name: "Accessories", slug: "accessories", description: null },
  },
] as unknown as CatalogProduct[];

interface StorefrontLiveRendererProps {
  initialSections: StorefrontSectionData[];
  isPreview: boolean;
  pageVersionNumber?: number;
}

export default function StorefrontLiveRenderer({
  initialSections,
  isPreview,
  pageVersionNumber,
}: StorefrontLiveRendererProps) {
  const [sections, setSections] = useState<StorefrontSectionData[]>(initialSections);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const isInsideIframe = useRef(false);

  useEffect(() => {
    setSections(initialSections);
  }, [initialSections]);

  useEffect(() => {
    isInsideIframe.current = typeof window !== "undefined" && window !== window.parent;

    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") return;

      if (event.data.type === "FERIO_STUDIO_SYNC_SECTIONS") {
        if (Array.isArray(event.data.sections)) {
          setSections(event.data.sections);
        }
      } else if (event.data.type === "FERIO_STUDIO_SCROLL_SECTION") {
        const id = event.data.sectionId;
        setSelectedSectionId(id);
        if (id) {
          const el = document.getElementById(`storefront-section-${id}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);

    // Announce ready to parent studio
    if (isInsideIframe.current) {
      try {
        window.parent.postMessage({ type: "FERIO_STOREFRONT_READY" }, "*");
      } catch (e) {
        // cross-origin safeguard
      }
    }

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const handleSectionClick = (sectionId: string) => {
    if (!isPreview) return;
    setSelectedSectionId(sectionId);
    if (isInsideIframe.current) {
      try {
        window.parent.postMessage(
          {
            type: "FERIO_STOREFRONT_SECTION_CLICKED",
            sectionId,
          },
          "*",
        );
      } catch (e) {}
    }
  };

  const activeSections = sections
    .filter((section) => (isPreview ? true : section.enabled))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (activeSections.length === 0) {
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
                Add sections in Storefront Studio to build your layout.
              </span>
            </div>
          </aside>
        )}
        <section className="flex flex-1 flex-col items-center justify-center py-24 px-6 text-center">
          <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface/50 p-8">
            <h2 className="text-[17px] font-semibold text-ink">Welcome to your new storefront</h2>
            <p className="mt-2 text-[13px] text-ink2 leading-relaxed">
              No sections are published yet. Use Storefront Studio to add hero showcases, product collections, and custom banners.
            </p>
          </div>
        </section>
      </main>
    );
  }

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
              Viewing Working Draft {pageVersionNumber ? `(v${pageVersionNumber})` : ""}
            </span>
            <span className="hidden sm:inline text-white/40">•</span>
            <span className="hidden sm:inline text-[11px] text-white/70">
              Live Real-Time Sync Active. Click any section to customize.
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
        const Component = sectionRegistry[section.type as StorefrontSectionType];
        if (!Component) return null;

        // Populate sample data for preview if store catalog is currently empty
        const isCategoryGrid = section.type === "CATEGORY_GRID";
        const isProductGrid =
          section.type === "PRODUCT_GRID" ||
          section.type === "PRODUCT_CAROUSEL" ||
          section.type === "FLASH_SALE" ||
          section.type === "PROMOTIONAL_BANNER";

        const hasZeroCategories =
          isCategoryGrid && (!section.data?.categories || section.data.categories.length === 0);
        const hasZeroProducts =
          isProductGrid && (!section.data?.items || section.data.items.length === 0);

        // On live public storefront, respect hideWhenEmpty
        if (!isPreview && section.settings?.hideWhenEmpty && (hasZeroCategories || hasZeroProducts)) {
          return null;
        }

        // On preview studio, synthesize sample catalog data so editor sees layout
        let enrichedData = section.data || {};
        let isMockDataUsed = false;

        if (isPreview && hasZeroCategories) {
          enrichedData = { ...enrichedData, categories: MOCK_CATEGORIES };
          isMockDataUsed = true;
        } else if (isPreview && hasZeroProducts) {
          enrichedData = { ...enrichedData, items: MOCK_PRODUCTS };
          isMockDataUsed = true;
        }

        const isSelected = isPreview && selectedSectionId === section.id;

        return (
          <div
            key={section.id}
            id={`storefront-section-${section.id}`}
            onClick={() => handleSectionClick(section.id)}
            className={`transition-all duration-200 relative ${
              isPreview ? "cursor-pointer hover:outline hover:outline-2 hover:outline-ink/20" : ""
            } ${
              isSelected ? "outline outline-2 outline-ink ring-4 ring-ink/10 z-10" : ""
            }`}
          >
            {isPreview && isSelected && (
              <div className="absolute top-2 left-4 z-30 pointer-events-none rounded bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow-sm">
                Active in Studio ({section.type.replace(/_/g, " ")})
              </div>
            )}
            {isPreview && isMockDataUsed && (
              <div className="absolute top-2 right-4 z-30 pointer-events-none rounded bg-surface/90 border border-line px-2 py-0.5 text-[10px] text-ink2">
                Sample Catalog Items (Empty Storefront)
              </div>
            )}
            <Component
              settings={section.settings || {}}
              data={enrichedData}
            />
          </div>
        );
      })}
    </main>
  );
}
