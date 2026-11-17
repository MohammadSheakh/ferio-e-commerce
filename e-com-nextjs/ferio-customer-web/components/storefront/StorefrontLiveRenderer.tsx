"use client";

import React, { useState, useEffect, useRef, Component as ReactComponent, ErrorInfo, ReactNode } from "react";
import Link from "next/link";
import { sectionRegistry } from "./registry";
import { StorefrontSectionData, StorefrontSectionType } from "@/lib/storefront";
import { CatalogCategory, CatalogProduct } from "@/lib/catalog";

class SectionErrorBoundary extends ReactComponent<
  { children: ReactNode; sectionTitle: string; isPreview: boolean },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode; sectionTitle: string; isPreview: boolean }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[StorefrontSection: ${this.props.sectionTitle}] Render error:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (!this.props.isPreview) {
        // In live production, gracefully do not crash the rest of the store
        return null;
      }
      return (
        <div className="mx-auto max-w-4xl p-6 my-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 text-xs font-mono">
          <div className="flex items-center gap-2 font-bold text-rose-800 mb-1">
            <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Section Render Fault: {this.props.sectionTitle}
          </div>
          <p className="text-rose-700 leading-relaxed">
            {this.state.error?.message || "An unexpected error occurred rendering this section."}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  const [inIframe, setInIframe] = useState<boolean>(false);
  const [interactionMode, setInteractionMode] = useState<"edit" | "interact">("edit");
  const isInsideIframe = useRef(false);

  useEffect(() => {
    setSections(initialSections);
  }, [initialSections]);

  useEffect(() => {
    const isFrame = typeof window !== "undefined" && window !== window.parent;
    setInIframe(isFrame);
    isInsideIframe.current = isFrame;

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
      } else if (event.data.type === "FERIO_STUDIO_SET_INTERACTION_MODE") {
        if (event.data.mode === "edit" || event.data.mode === "interact") {
          setInteractionMode(event.data.mode);
        }
      }
    };

    window.addEventListener("message", handleMessage);

    // Announce ready to parent studio
    if (isFrame) {
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

  const handleSectionClick = (e: React.MouseEvent, sectionId: string) => {
    if (!isPreview) return;
    if (interactionMode === "edit") {
      // In edit mode, clicking selects the section instead of following child links
      e.stopPropagation();
    }
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
        {/* Only show minimal preview bar if in standalone tab, never inside Studio iframe */}
        {isPreview && !inIframe && (
          <aside
            aria-label="Draft Preview Bar"
            className="sticky top-0 z-50 flex items-center justify-between border-b border-line bg-paper/95 backdrop-blur px-6 py-2 text-ink shadow-2xs"
          >
            <div className="flex items-center gap-2 text-[12px]">
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                Preview Mode
              </span>
              <span className="text-[12px] text-ink2">
                Empty Storefront Canvas
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
      {/* Sleek Minimal Preview Bar - ONLY rendered in standalone tabs, NEVER inside Studio iframe */}
      {isPreview && !inIframe && (
        <aside
          aria-label="Draft Preview Bar"
          className="sticky top-0 z-50 flex items-center justify-between border-b border-line bg-paper/95 backdrop-blur px-6 py-2 text-ink shadow-2xs"
        >
          <div className="flex items-center gap-2 text-[12px]">
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-medium text-emerald-700">
              Live Preview
            </span>
            <span className="font-medium text-ink">
              Draft {pageVersionNumber ? `v${pageVersionNumber}` : ""}
            </span>
            <span className="text-ink2/40">•</span>
            <span className="text-[11px] text-ink2">
              Changes sync real-time with Storefront Studio
            </span>
          </div>
          <Link
            href="/"
            className="rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-medium text-ink transition hover:bg-paper"
          >
            Exit Preview
          </Link>
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
            onClick={(e) => handleSectionClick(e, section.id)}
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
            <SectionErrorBoundary
              sectionTitle={section.type.replace(/_/g, " ")}
              isPreview={isPreview}
            >
              <Component
                settings={section.settings || {}}
                data={enrichedData}
                section={section}
              />
            </SectionErrorBoundary>
          </div>
        );
      })}
    </main>
  );
}
