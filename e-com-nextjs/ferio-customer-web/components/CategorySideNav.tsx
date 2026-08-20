"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { type CatalogCategory, getCategories } from "@/lib/catalog";

export interface CategoryNode extends CatalogCategory {
  children: CategoryNode[];
}

function buildCategoryTree(categories: CatalogCategory[]): CategoryNode[] {
  const nodeMap = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  categories.forEach((cat) => {
    nodeMap.set(cat.id, { ...cat, children: [] });
  });

  categories.forEach((cat) => {
    const node = nodeMap.get(cat.id)!;
    if (cat.parentId && nodeMap.has(cat.parentId)) {
      nodeMap.get(cat.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    nodes.forEach((n) => sortNodes(n.children));
  };

  sortNodes(roots);
  return roots;
}

// Fallback Categories (Commented out for reference)
// const FALLBACK_CATEGORIES: CatalogCategory[] = [
//   { id: "1", name: "Fashion & Lifestyle", slug: "fashion-lifestyle", description: null, parentId: null, sortOrder: 1, isActive: true },
//   { id: "2", name: "Baby Care", slug: "baby-care", description: null, parentId: null, sortOrder: 2, isActive: true },
//   { id: "3", name: "Personal Care", slug: "personal-care", description: null, parentId: null, sortOrder: 3, isActive: true },
//   { id: "31", name: "Women's Care", slug: "womens-care", description: null, parentId: "3", sortOrder: 1, isActive: true },
//   { id: "311", name: "Women's Soaps", slug: "womens-soaps", description: null, parentId: "31", sortOrder: 1, isActive: true },
//   { id: "312", name: "Hair Care", slug: "hair-care", description: null, parentId: "31", sortOrder: 2, isActive: true },
//   { id: "313", name: "Women's Shampoos & Conditioners", slug: "shampoos-conditioners", description: null, parentId: "31", sortOrder: 3, isActive: true },
//   { id: "314", name: "Feminine Care", slug: "feminine-care", description: null, parentId: "31", sortOrder: 4, isActive: true },
//   { id: "315", name: "Female Moisturizer", slug: "female-moisturizer", description: null, parentId: "31", sortOrder: 5, isActive: true },
//   { id: "316", name: "Face Wash & Scrub", slug: "facewash-scrub", description: null, parentId: "31", sortOrder: 6, isActive: true },
//   { id: "317", name: "Female Deo", slug: "female-deo", description: null, parentId: "31", sortOrder: 7, isActive: true },
//   { id: "318", name: "Women's Perfume", slug: "womens-perfume", description: null, parentId: "31", sortOrder: 8, isActive: true },
//   { id: "319", name: "Women's Shower Gel", slug: "womens-shower-gel", description: null, parentId: "31", sortOrder: 9, isActive: true },
//   { id: "32", name: "Men's Care", slug: "mens-care", description: null, parentId: "3", sortOrder: 2, isActive: true },
//   { id: "321", name: "Men's Shaving & Beard Care", slug: "shaving-beard", description: null, parentId: "32", sortOrder: 1, isActive: true },
//   { id: "322", name: "Men's Hair Styling", slug: "mens-hair-styling", description: null, parentId: "32", sortOrder: 2, isActive: true },
//   { id: "33", name: "Handwash", slug: "handwash", description: null, parentId: "3", sortOrder: 3, isActive: true },
//   { id: "34", name: "Tissue & Wipes", slug: "tissue-wipes", description: null, parentId: "3", sortOrder: 4, isActive: true },
//   { id: "35", name: "Oral Care", slug: "oral-care", description: null, parentId: "3", sortOrder: 5, isActive: true },
//   { id: "36", name: "Skin Care", slug: "skin-care", description: null, parentId: "3", sortOrder: 6, isActive: true },
//   { id: "4", name: "Office Equipments", slug: "office-equipments", description: null, parentId: null, sortOrder: 4, isActive: true },
//   { id: "41", name: "Barcode Scanner", slug: "barcode-scanner", description: null, parentId: "4", sortOrder: 1, isActive: true },
//   { id: "411", name: "Honeywell", slug: "honeywell", description: null, parentId: "41", sortOrder: 1, isActive: true },
//   { id: "412", name: "Netum", slug: "netum", description: null, parentId: "41", sortOrder: 2, isActive: true },
//   { id: "413", name: "Zebra", slug: "zebra", description: null, parentId: "41", sortOrder: 3, isActive: true },
//   { id: "42", name: "Cash Drawer", slug: "cash-drawer", description: null, parentId: "4", sortOrder: 2, isActive: true },
//   { id: "43", name: "Label Printer", slug: "label-printer", description: null, parentId: "4", sortOrder: 3, isActive: true },
// ];

const CATEGORY_IMAGES: Record<string, string> = {
  "womens-soaps": "https://images.unsplash.com/photo-1607006482172-132279177114?auto=format&fit=crop&w=400&q=80",
  "hair-care": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80",
  "shampoos-conditioners": "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=400&q=80",
  "female-deo": "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=400&q=80",
  "womens-perfume": "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=400&q=80",
  "womens-shower-gel": "https://images.unsplash.com/photo-1585232351009-aa87416fca90?auto=format&fit=crop&w=400&q=80",
  "facewash-scrub": "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80",
  "female-moisturizer": "https://images.unsplash.com/photo-1608248597261-83d1c1694d93?auto=format&fit=crop&w=400&q=80",
  "barcode-scanner": "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=400&q=80",
};

const DEFAULT_GRID_IMAGE = "https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=400&q=80";

export default function CategorySideNav({
  categories = [],
}: {
  categories?: CatalogCategory[];
}) {
  const pathname = usePathname();
  if (pathname?.startsWith("/delivery")) return null;
  const [categoriesList, setCategoriesList] = useState<CatalogCategory[]>(categories);
  const [isOpen, setIsOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");

  useEffect(() => {
    if (categories.length > 0) {
      setCategoriesList(categories);
    } else {
      getCategories()
        .then((cats) => {
          if (Array.isArray(cats) && cats.length > 0) {
            setCategoriesList(cats);
          }
        })
        .catch(() => {});
    }
  }, [categories]);

  const tree = useMemo(() => {
    return buildCategoryTree(categoriesList);
  }, [categoriesList]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const findNode = (nodes: CategoryNode[], id: string): CategoryNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = findNode(node.children, id);
      if (found) return found;
    }
    return null;
  };

  const activeNode = useMemo(() => {
    return findNode(tree, selectedNodeId) || tree[0] || null;
  }, [tree, selectedNodeId]);

  const breadcrumbs = useMemo(() => {
    if (!activeNode) return [];
    const crumbs: CategoryNode[] = [activeNode];
    let curr = activeNode;
    while (curr.parentId) {
      const parent = findNode(tree, curr.parentId);
      if (!parent) break;
      crumbs.unshift(parent);
      curr = parent;
    }
    return crumbs;
  }, [activeNode, tree]);

  const renderNavItems = (nodes: CategoryNode[], level = 0) => {
    return nodes.map((node) => {
      const hasChildren = node.children.length > 0;
      const isExpanded = !!expandedNodes[node.id];
      const isSelected = selectedNodeId === node.id;

      return (
        <div key={node.id} className="w-full">
          <div
            onClick={() => {
              setSelectedNodeId(node.id);
              if (hasChildren) {
                setExpandedNodes((prev) => ({ ...prev, [node.id]: true }));
              }
            }}
            className={`group flex items-center justify-between cursor-pointer rounded-lg px-3 py-2 text-[13.5px] transition-all select-none ${
              isSelected
                ? "bg-purple-50 text-purple-700 font-semibold"
                : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            }`}
            style={{ paddingLeft: `${Math.max(12, level * 16 + 12)}px` }}
          >
            <span className="truncate">{node.name}</span>
            {hasChildren && (
              <button
                type="button"
                onClick={(e) => toggleExpand(node.id, e)}
                className="ml-2 p-1 text-gray-400 hover:text-gray-700 transition-colors"
                aria-label="Toggle subcategories"
              >
                <svg
                  className={`h-3.5 w-3.5 transform transition-transform duration-200 ${
                    isExpanded ? "rotate-90 text-purple-600" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          {/* Subcategory Accordion */}
          {hasChildren && isExpanded && (
            <div className="mt-0.5 space-y-0.5 border-l border-gray-100 ml-4">
              {renderNavItems(node.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <>
      {/* Floating / Sticky Collapsible Side Nav Trigger Button */}
      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-2.5 rounded-full bg-ink px-4 py-3 text-xs font-semibold text-white shadow-2xl transition hover:bg-gray-800 focus:outline-none"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          <span>{isOpen ? "Close Categories" : "Shop by Category"}</span>
        </button>
      </div>

      {/* Side Navigation Overlay Drawer Container */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in">
          {/* Main Side Panel Box */}
          <div className="relative flex h-full w-full max-w-5xl bg-white shadow-2xl overflow-hidden rounded-r-2xl border-r border-gray-200">
            
            {/* Left Column: Vertical Category List */}
            <div className="w-72 sm:w-80 flex-shrink-0 border-r border-gray-200/80 bg-white p-4 overflow-y-auto scrollbar-thin">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  All Categories
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-1">{renderNavItems(tree)}</div>
            </div>

            {/* Right Column: Grid Card Category Showcase Panel */}
            <div className="flex-1 p-6 overflow-y-auto bg-[#fafafa]">
              {/* Header Breadcrumb */}
              <div className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-600">
                {breadcrumbs.map((crumb, idx) => (
                  <span key={crumb.id} className="flex items-center gap-2">
                    {idx > 0 && <span className="text-gray-300">›</span>}
                    <span
                      className={
                        idx === breadcrumbs.length - 1
                          ? "font-bold text-gray-900"
                          : "hover:text-purple-600 cursor-pointer"
                      }
                      onClick={() => setSelectedNodeId(crumb.id)}
                    >
                      {crumb.name}
                    </span>
                  </span>
                ))}
              </div>

              {/* Category Grid Display Cards */}
              {activeNode && activeNode.children.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                  {activeNode.children.map((child) => {
                    const imgSrc = CATEGORY_IMAGES[child.slug] || DEFAULT_GRID_IMAGE;
                    return (
                      <Link
                        key={child.id}
                        href={`/products?category=${child.slug}`}
                        onClick={() => setIsOpen(false)}
                        className="group flex flex-col items-center rounded-2xl border border-gray-200/80 bg-white p-4 text-center shadow-sm transition hover:shadow-md hover:border-purple-300"
                      >
                        <div className="relative aspect-square w-full max-w-[160px] overflow-hidden rounded-xl bg-gray-50 mb-3">
                          <Image
                            src={imgSrc}
                            alt={child.name}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-800 transition group-hover:text-purple-600 line-clamp-2">
                          {child.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <h4 className="text-base font-semibold text-gray-800">{activeNode?.name}</h4>
                  <p className="mt-1 text-xs text-gray-500 max-w-sm">
                    Browse all products available under this category collection.
                  </p>
                  <Link
                    href={`/products?category=${activeNode?.slug}`}
                    onClick={() => setIsOpen(false)}
                    className="mt-4 rounded-full bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-purple-700 transition-colors"
                  >
                    View All Products →
                  </Link>
                </div>
              )}
            </div>

          </div>

          {/* Close Overlay Backdrop Click */}
          <div className="flex-1" onClick={() => setIsOpen(false)} />
        </div>
      )}
    </>
  );
}
