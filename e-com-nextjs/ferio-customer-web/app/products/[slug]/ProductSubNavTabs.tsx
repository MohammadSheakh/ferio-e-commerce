"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import type { CatalogProduct } from "@/lib/catalog";

interface ProductSubNavTabsProps {
  product: CatalogProduct;
  children?: ReactNode;
}

type TabType = "specification" | "description" | "reviews" | "questions";

export default function ProductSubNavTabs({ product, children }: ProductSubNavTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("specification");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      // Hide CategoryNav when ProductSubNavTabs reaches near top header position
      const isStickyTriggered = rect.top <= 130 && rect.bottom >= 100;

      window.dispatchEvent(
        new CustomEvent("toggle-category-nav", { detail: { hide: isStickyTriggered } })
      );

      // ScrollSpy: Update active tab based on element position
      const specEl = document.getElementById("specifications-section");
      const descEl = document.getElementById("description-section");
      const revEl = document.getElementById("reviews-section") || document.getElementById("youtube-reviews-section");
      const qaEl = document.getElementById("questions-section");

      const topOffset = 140;

      if (qaEl && qaEl.getBoundingClientRect().top <= topOffset) {
        setActiveTab("questions");
      } else if (revEl && revEl.getBoundingClientRect().top <= topOffset) {
        setActiveTab("reviews");
      } else if (descEl && descEl.getBoundingClientRect().top <= topOffset) {
        setActiveTab("description");
      } else if (specEl && specEl.getBoundingClientRect().top <= topOffset + 100) {
        setActiveTab("specification");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.dispatchEvent(
        new CustomEvent("toggle-category-nav", { detail: { hide: false } })
      );
    };
  }, []);

  // Group specifications by category group (e.g., "Display Features", "Connectivity", etc.)
  const groupedSpecs = (product.specifications || []).reduce<Record<string, Array<{ key: string; value: string }>>>(
    (acc, item) => {
      const groupName = item.group?.trim() || "General";
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push({ key: item.key, value: item.value });
      return acc;
    },
    {}
  );

  const groupKeys = Object.keys(groupedSpecs);

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    const sectionMap: Record<TabType, string> = {
      specification: "specifications-section",
      description: "description-section",
      reviews: "youtube-reviews-section",
      questions: "questions-section",
    };

    const el = document.getElementById(sectionMap[tab]) || document.getElementById("reviews-section");
    if (el) {
      const yOffset = -110;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <div ref={containerRef} className="mt-12 space-y-8 relative">
      {/* Sub Navbar Tab Bar Header - STICKY directly below main header */}
      <div className="sticky top-[64px] sm:top-[68px] z-30 bg-white/95 backdrop-blur-md border-b border-line/60 py-3.5 -mx-4 px-4 sm:-mx-6 sm:px-6 transition-all shadow-xs">
        <nav className="flex gap-8 overflow-x-auto scrollbar-none max-w-6xl mx-auto" aria-label="Product Sections">
          <button
            onClick={() => handleTabClick("specification")}
            className={`pb-2 text-[15px] font-medium transition-colors whitespace-nowrap relative ${
              activeTab === "specification"
                ? "text-emerald-700 font-semibold"
                : "text-ink2 hover:text-ink"
            }`}
          >
            Specification
            {activeTab === "specification" && (
              <span className="absolute -bottom-3.5 left-0 right-0 h-[2.5px] bg-emerald-700 rounded-full" />
            )}
          </button>

          <button
            onClick={() => handleTabClick("description")}
            className={`pb-2 text-[15px] font-medium transition-colors whitespace-nowrap relative ${
              activeTab === "description"
                ? "text-emerald-700 font-semibold"
                : "text-ink2 hover:text-ink"
            }`}
          >
            Description
            {activeTab === "description" && (
              <span className="absolute -bottom-3.5 left-0 right-0 h-[2.5px] bg-emerald-700 rounded-full" />
            )}
          </button>

          <button
            onClick={() => handleTabClick("reviews")}
            className={`pb-2 text-[15px] font-medium transition-colors whitespace-nowrap relative ${
              activeTab === "reviews"
                ? "text-emerald-700 font-semibold"
                : "text-ink2 hover:text-ink"
            }`}
          >
            Reviews
            {activeTab === "reviews" && (
              <span className="absolute -bottom-3.5 left-0 right-0 h-[2.5px] bg-emerald-700 rounded-full" />
            )}
          </button>

          <button
            onClick={() => handleTabClick("questions")}
            className={`pb-2 text-[15px] font-medium transition-colors whitespace-nowrap relative ${
              activeTab === "questions"
                ? "text-emerald-700 font-semibold"
                : "text-ink2 hover:text-ink"
            }`}
          >
            Questions
            {activeTab === "questions" && (
              <span className="absolute -bottom-3.5 left-0 right-0 h-[2.5px] bg-emerald-700 rounded-full" />
            )}
          </button>
        </nav>
      </div>

      {/* Specifications Section */}
      <div id="specifications-section" className="scroll-mt-32">
        <h2 className="text-[18px] font-bold text-ink mb-4">Specifications</h2>
        <div className="rounded-card border border-line/50 bg-white p-6 sm:p-8 shadow-sm space-y-8">
          {groupKeys.length > 0 ? (
            groupKeys.map((groupName) => (
              <div key={groupName} className="space-y-3">
                <h3 className="text-[16px] font-semibold text-ink border-b border-line/30 pb-2">
                  {groupName}
                </h3>
                <div className="divide-y divide-line/30">
                  {groupedSpecs[groupName].map((item, idx) => (
                    <div
                      key={`${item.key}-${idx}`}
                      className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-2 py-3 text-[14px]"
                    >
                      <span className="text-ink2 font-normal">{item.key}</span>
                      <span className="text-ink font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="space-y-3">
              <h3 className="text-[16px] font-semibold text-ink border-b border-line/30 pb-2">
                General Product Specifications
              </h3>
              <div className="divide-y divide-line/30">
                <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-2 py-3 text-[14px]">
                  <span className="text-ink2 font-normal">Brand</span>
                  <span className="text-ink font-medium">{product.brand || "Ferio"}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-2 py-3 text-[14px]">
                  <span className="text-ink2 font-normal">Category</span>
                  <span className="text-ink font-medium">{product.category?.name || "General"}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-2 py-3 text-[14px]">
                  <span className="text-ink2 font-normal">Condition</span>
                  <span className="text-ink font-medium">{product.condition === "NEW" ? "Brand New" : "Pre-owned"}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-2 py-3 text-[14px]">
                  <span className="text-ink2 font-normal">COD Available</span>
                  <span className="text-ink font-medium">{product.codAvailable ? "Yes" : "No"}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Description Section */}
      <div id="description-section" className="scroll-mt-32 pt-4">
        <h2 className="text-[18px] font-bold text-ink mb-4">Detailed Description</h2>
        <div className="rounded-card border border-line/50 bg-white p-6 sm:p-8 shadow-sm">
          <div className="prose max-w-none text-ink text-[15px] leading-relaxed [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_blockquote]:border-l-4 [&_blockquote]:border-emerald-600 [&_blockquote]:pl-4 [&_blockquote]:italic [&_img]:my-6 [&_img]:max-w-full [&_img]:rounded-2xl [&_img]:shadow-sm [&_img]:border [&_img]:border-line/40 [&_img]:block [&_img]:mx-auto">
            {product.description ? (
              <div dangerouslySetInnerHTML={{ __html: product.description }} />
            ) : (
              <p className="text-ink2 italic">No detailed description available for this product.</p>
            )}
          </div>
        </div>
      </div>

      {/* Other sections passed as children (Reviews, Questions, Related Products) stay inside this parent wrapper so subnav remains sticky! */}
      {children}
    </div>
  );
}
