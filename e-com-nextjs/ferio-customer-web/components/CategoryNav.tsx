"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { type CatalogCategory, getCategories } from "@/lib/catalog";

export type CategoryNode = CatalogCategory & {
  children: CategoryNode[];
};

/*
// Fallback Tech Categories (Commented out for reference)
const FALLBACK_CATEGORIES: CatalogCategory[] = [
  // Level 1 Root Categories
  { id: "cat-desktop", name: "Desktop", slug: "desktop", description: null, parentId: null, sortOrder: 1 },
  { id: "cat-laptop", name: "Laptop", slug: "laptop", description: null, parentId: null, sortOrder: 2 },
  { id: "cat-components", name: "Components", slug: "components", description: null, parentId: null, sortOrder: 3 },
  { id: "cat-accessories", name: "Accessories", slug: "accessories", description: null, parentId: null, sortOrder: 4 },
  { id: "cat-monitor", name: "Monitor", slug: "monitor", description: null, parentId: null, sortOrder: 5 },
  { id: "cat-networking", name: "Networking", slug: "networking", description: null, parentId: null, sortOrder: 6 },
  { id: "cat-office", name: "Office Equipments", slug: "office-equipments", description: null, parentId: null, sortOrder: 7 },
  { id: "cat-ups", name: "UPS", slug: "ups", description: null, parentId: null, sortOrder: 8 },
  { id: "cat-security", name: "Security", slug: "security", description: null, parentId: null, sortOrder: 9 },
  { id: "cat-camera", name: "Camera", slug: "camera", description: null, parentId: null, sortOrder: 10 },
  { id: "cat-gadget", name: "Gadget", slug: "gadget", description: null, parentId: null, sortOrder: 11 },
  { id: "cat-ai", name: "AI Workstation", slug: "ai-workstation", description: null, parentId: null, sortOrder: 12 },
  { id: "cat-gaming", name: "Gaming", slug: "gaming", description: null, parentId: null, sortOrder: 13 },
  { id: "cat-software", name: "Software", slug: "software", description: null, parentId: null, sortOrder: 14 },
  { id: "cat-server", name: "Server & Accessories", slug: "server-accessories", description: null, parentId: null, sortOrder: 15 },

  // Level 2 Subcategories under "Office Equipments"
  { id: "sub-barcode", name: "Barcode Scanner", slug: "barcode-scanner", description: null, parentId: "cat-office", sortOrder: 1 },
  { id: "sub-cash", name: "Cash Drawer", slug: "cash-drawer", description: null, parentId: "cat-office", sortOrder: 2 },
  { id: "sub-flat-panel", name: "Interactive Flat Panel", slug: "interactive-flat-panel", description: null, parentId: "cat-office", sortOrder: 3 },
  { id: "sub-label-printer", name: "Label Printer", slug: "label-printer", description: null, parentId: "cat-office", sortOrder: 4 },
  { id: "sub-paper-shredder", name: "Paper Shredder", slug: "paper-shredder", description: null, parentId: "cat-office", sortOrder: 5 },
  { id: "sub-photocopier", name: "Photocopier", slug: "photocopier", description: null, parentId: "cat-office", sortOrder: 6 },
  { id: "sub-pos-printer", name: "POS Printer", slug: "pos-printer", description: null, parentId: "cat-office", sortOrder: 7 },
  { id: "sub-printer", name: "Printer", slug: "printer", description: null, parentId: "cat-office", sortOrder: 8 },
  { id: "sub-projector", name: "Projector", slug: "projector", description: null, parentId: "cat-office", sortOrder: 9 },
  { id: "sub-scanner", name: "Scanner", slug: "scanner", description: null, parentId: "cat-office", sortOrder: 10 },
  { id: "sub-toner", name: "Toner", slug: "toner", description: null, parentId: "cat-office", sortOrder: 11 },
  { id: "sub-conference", name: "Conference System", slug: "conference-system", description: null, parentId: "cat-office", sortOrder: 12 },
  { id: "sub-presenter", name: "Presenter", slug: "presenter", description: null, parentId: "cat-office", sortOrder: 13 },

  // Level 3 Sub-subcategories under "Barcode Scanner"
  { id: "l3-honeywell", name: "Honeywell", slug: "honeywell", description: null, parentId: "sub-barcode", sortOrder: 1 },
  { id: "l3-netum", name: "Netum", slug: "netum", description: null, parentId: "sub-barcode", sortOrder: 2 },
  { id: "l3-newland", name: "Newland", slug: "newland", description: null, parentId: "sub-barcode", sortOrder: 3 },
  { id: "l3-yumite", name: "Yumite", slug: "yumite", description: null, parentId: "sub-barcode", sortOrder: 4 },
  { id: "l3-zebra", name: "Zebra", slug: "zebra", description: null, parentId: "sub-barcode", sortOrder: 5 },

  // Level 3 Sub-subcategories under "Cash Drawer"
  { id: "l3-cd-netum", name: "Netum", slug: "cash-drawer-netum", description: null, parentId: "sub-cash", sortOrder: 1 },
  { id: "l3-cd-honeywell", name: "Honeywell", slug: "cash-drawer-honeywell", description: null, parentId: "sub-cash", sortOrder: 2 },
];
*/

function buildCategoryTree(rawCategories: CatalogCategory[]): CategoryNode[] {
  if (!rawCategories || rawCategories.length === 0) return [];

  const categoryMap = new Map<string, CategoryNode>();
  const rootNodes: CategoryNode[] = [];

  // Step 1: Initialize nodes with empty children array
  rawCategories.forEach((cat) => {
    categoryMap.set(cat.id, { ...cat, children: [] });
  });

  // Step 2: Assemble parent-child tree
  rawCategories.forEach((cat) => {
    const node = categoryMap.get(cat.id)!;
    if (cat.parentId && categoryMap.has(cat.parentId)) {
      const parentNode = categoryMap.get(cat.parentId)!;
      parentNode.children.push(node);
    } else {
      rootNodes.push(node);
    }
  });

  // Step 3: Sort nodes by sortOrder then name
  const sortFn = (a: CategoryNode, b: CategoryNode) => {
    const orderA = a.sortOrder ?? 0;
    const orderB = b.sortOrder ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);
  };

  const sortRecursively = (nodes: CategoryNode[]) => {
    nodes.sort(sortFn);
    nodes.forEach((n) => {
      if (n.children.length > 0) sortRecursively(n.children);
    });
  };

  sortRecursively(rootNodes);
  return rootNodes;
}

export default function CategoryNav({
  categories: initialCategories = [],
}: {
  categories?: CatalogCategory[];
}) {
  const [categoriesList, setCategoriesList] = useState<CatalogCategory[]>(initialCategories);
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [activeRootId, setActiveRootId] = useState<string | null>(null);
  const [activeSubId, setActiveSubId] = useState<string | null>(null);
  const [isHidden, setIsHidden] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleToggleNav = (e: Event) => {
      const customEvent = e as CustomEvent<{ hide: boolean }>;
      setIsHidden(!!customEvent.detail?.hide);
    };

    window.addEventListener("toggle-category-nav", handleToggleNav);
    return () => {
      window.removeEventListener("toggle-category-nav", handleToggleNav);
    };
  }, []);

  useEffect(() => {
    if (initialCategories.length > 0) {
      setCategoriesList(initialCategories);
    } else {
      getCategories()
        .then((cats) => {
          if (Array.isArray(cats) && cats.length > 0) {
            setCategoriesList(cats);
          }
        })
        .catch(() => {});
    }
  }, [initialCategories]);

  useEffect(() => {
    setTree(buildCategoryTree(categoriesList));
  }, [categoriesList]);

  const activeRoot = tree.find((node) => node.id === activeRootId);
  const activeSub = activeRoot?.children.find((child) => child.id === activeSubId);

  const handleRootMouseEnter = (rootId: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveRootId(rootId);

    const rootNode = tree.find((node) => node.id === rootId);
    if (rootNode && rootNode.children.length > 0) {
      // Automatically highlight the first subcategory
      setActiveSubId(rootNode.children[0].id);
    } else {
      setActiveSubId(null);
    }
  };

  const handleSubMouseEnter = (subId: string) => {
    setActiveSubId(subId);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveRootId(null);
      setActiveSubId(null);
    }, 150);
  };

  const handleMouseEnterContainer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  if (tree.length === 0) return null;

  return (
    <div
      className={`relative z-50 bg-white font-sans transition-all duration-300 ${
        isHidden
          ? "max-h-0 opacity-0 overflow-hidden border-none pointer-events-none py-0"
          : "max-h-24 opacity-100 overflow-visible border-b border-gray-200/80"
      }`}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnterContainer}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 md:px-6 overflow-visible">
        <div className="flex items-center gap-0.5 md:gap-1.5 py-1 text-[13px] overflow-visible flex-wrap md:flex-nowrap">
          {tree.map((rootNode) => {
            const isHovered = activeRootId === rootNode.id;
            const hasChildren = rootNode.children.length > 0;

            return (
              <div
                key={rootNode.id}
                className="relative py-2"
                onMouseEnter={() => handleRootMouseEnter(rootNode.id)}
              >
                <Link
                  href={`/products?category=${rootNode.slug}`}
                  className={`inline-flex items-center gap-1 rounded px-2.5 py-1 font-medium transition-colors whitespace-nowrap select-none ${
                    isHovered
                      ? "text-rose-600 font-semibold"
                      : "text-gray-700 hover:text-rose-600"
                  }`}
                >
                  {rootNode.name}
                </Link>

                {/* Multi-Level Mega Dropdown */}
                {isHovered && hasChildren && (
                  <div
                    className="absolute left-0 top-full z-50 flex rounded-b-md border border-gray-200 bg-white text-[13px] text-gray-800 shadow-2xl transition-all duration-150 animate-in fade-in slide-in-from-top-1"
                    style={{ minHeight: "360px" }}
                  >
                    {/* Column 1: Subcategories (Level 2) */}
                    <div className="flex w-[230px] flex-col justify-between border-r border-gray-100 py-2.5">
                      <div className="flex flex-col">
                        {rootNode.children.map((subNode) => {
                          const isSubHovered = activeSubId === subNode.id;
                          const hasSubChildren = subNode.children.length > 0;

                          return (
                            <Link
                              key={subNode.id}
                              href={`/products?category=${subNode.slug}`}
                              onMouseEnter={() => handleSubMouseEnter(subNode.id)}
                              className={`flex items-center justify-between px-4 py-1.5 transition-colors cursor-pointer ${
                                isSubHovered
                                  ? "bg-emerald-50/70 font-semibold text-emerald-600"
                                  : "text-gray-700 hover:bg-slate-50 hover:text-emerald-600"
                              }`}
                            >
                              <span>{subNode.name}</span>
                              {hasSubChildren && (
                                <svg
                                  className={`h-2.5 w-2.5 transition-transform ${
                                    isSubHovered ? "fill-emerald-600" : "fill-gray-400"
                                  }`}
                                  viewBox="0 0 6 10"
                                >
                                  <polygon points="0 0, 6 5, 0 10" />
                                </svg>
                              )}
                            </Link>
                          );
                        })}
                      </div>

                      {/* Show All Root Category Link at Bottom of Col 1 */}
                      <div className="mt-2 border-t border-gray-100 px-4 pt-2">
                        <Link
                          href={`/products?category=${rootNode.slug}`}
                          className="flex items-center gap-1 font-medium text-gray-800 hover:text-rose-600"
                        >
                          <span>Show All {rootNode.name}</span>
                        </Link>
                      </div>
                    </div>

                    {/* Column 2: Sub-subcategories (Level 3) */}
                    {activeSub && activeSub.children.length > 0 && (
                      <div className="flex w-[210px] flex-col justify-between bg-white py-2.5">
                        <div className="flex flex-col">
                          {activeSub.children.map((subSubNode) => (
                            <Link
                              key={subSubNode.id}
                              href={`/products?category=${subSubNode.slug}`}
                              className="px-4 py-1.5 text-gray-600 hover:bg-slate-50 hover:text-rose-600 transition-colors"
                            >
                              {subSubNode.name}
                            </Link>
                          ))}
                        </div>

                        {/* Show All Subcategory Link at Bottom of Col 2 */}
                        <div className="mt-2 border-t border-gray-100 px-4 pt-2">
                          <Link
                            href={`/products?category=${activeSub.slug}`}
                            className="flex items-center gap-1 font-medium text-gray-800 hover:text-rose-600"
                          >
                            <span>Show All {activeSub.name}</span>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
