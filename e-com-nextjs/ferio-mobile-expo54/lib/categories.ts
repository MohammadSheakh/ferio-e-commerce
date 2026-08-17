import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { CatalogCategory } from '@/types/catalog';

export interface CategoryNode extends CatalogCategory {
  children: CategoryNode[];
}

export const FALLBACK_CATEGORIES: CatalogCategory[] = [
  // Top Level Roots
  { id: 'cat-desktop', name: 'Desktop', slug: 'desktop', description: null, parentId: null, sortOrder: 1 },
  { id: 'cat-laptop', name: 'Laptop', slug: 'laptop', description: null, parentId: null, sortOrder: 2 },
  { id: 'cat-components', name: 'Components', slug: 'components', description: null, parentId: null, sortOrder: 3 },
  { id: 'cat-accessories', name: 'Accessories', slug: 'accessories', description: null, parentId: null, sortOrder: 4 },
  { id: 'cat-office', name: 'Office Equipments', slug: 'office-equipments', description: null, parentId: null, sortOrder: 5 },
  { id: 'cat-personal', name: 'Personal Care', slug: 'personal-care', description: null, parentId: null, sortOrder: 6 },
  { id: 'cat-fashion', name: 'Fashion & Lifestyle', slug: 'fashion-lifestyle', description: null, parentId: null, sortOrder: 7 },
  { id: 'cat-gadget', name: 'Gadget & Smart Living', slug: 'gadget', description: null, parentId: null, sortOrder: 8 },

  // Subcategories under Office Equipments
  { id: 'sub-barcode', name: 'Barcode Scanner', slug: 'barcode-scanner', description: null, parentId: 'cat-office', sortOrder: 1 },
  { id: 'sub-cash', name: 'Cash Drawer', slug: 'cash-drawer', description: null, parentId: 'cat-office', sortOrder: 2 },
  { id: 'sub-printer', name: 'Printer & Scanners', slug: 'printer', description: null, parentId: 'cat-office', sortOrder: 3 },
  { id: 'sub-projector', name: 'Projectors', slug: 'projector', description: null, parentId: 'cat-office', sortOrder: 4 },

  // Subcategories under Personal Care
  { id: 'sub-women', name: "Women's Care", slug: 'womens-care', description: null, parentId: 'cat-personal', sortOrder: 1 },
  { id: 'sub-men', name: "Men's Care", slug: 'mens-care', description: null, parentId: 'cat-personal', sortOrder: 2 },
  { id: 'sub-skincare', name: 'Skin & Body Care', slug: 'skin-care', description: null, parentId: 'cat-personal', sortOrder: 3 },

  // Sub-subcategories under Barcode Scanner
  { id: 'l3-honeywell', name: 'Honeywell', slug: 'honeywell', description: null, parentId: 'sub-barcode', sortOrder: 1 },
  { id: 'l3-netum', name: 'Netum', slug: 'netum', description: null, parentId: 'sub-barcode', sortOrder: 2 },
  { id: 'l3-zebra', name: 'Zebra', slug: 'zebra', description: null, parentId: 'sub-barcode', sortOrder: 3 },

  // Sub-subcategories under Women's Care
  { id: 'l3-soaps', name: "Women's Soaps & Wash", slug: 'womens-soaps', description: null, parentId: 'sub-women', sortOrder: 1 },
  { id: 'l3-hair', name: 'Hair Care & Oils', slug: 'hair-care', description: null, parentId: 'sub-women', sortOrder: 2 },
  { id: 'l3-shampoo', name: 'Shampoos & Conditioners', slug: 'shampoos-conditioners', description: null, parentId: 'sub-women', sortOrder: 3 },
];

export function buildCategoryTree(rawCategories: CatalogCategory[]): CategoryNode[] {
  if (!rawCategories || rawCategories.length === 0) return [];

  const categoryMap = new Map<string, CategoryNode>();
  const rootNodes: CategoryNode[] = [];

  rawCategories.forEach((cat) => {
    categoryMap.set(cat.id, { ...cat, children: [] });
  });

  rawCategories.forEach((cat) => {
    const node = categoryMap.get(cat.id)!;
    if (cat.parentId && categoryMap.has(cat.parentId)) {
      const parentNode = categoryMap.get(cat.parentId)!;
      parentNode.children.push(node);
    } else {
      rootNodes.push(node);
    }
  });

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

export function useCategoryTree() {
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiGet<CatalogCategory[]>('/catalog/categories');
        const catList = Array.isArray(res) ? res : (res as any)?.data || [];
        if (Array.isArray(catList) && catList.length > 0) {
          const rootCount = catList.filter((c) => !c.parentId).length;
          if (rootCount < 3) {
            const existingIds = new Set(catList.map((c) => c.id));
            const existingSlugs = new Set(catList.map((c) => c.slug));
            const filtered = FALLBACK_CATEGORIES.filter(
              (f) => !existingIds.has(f.id) && !existingSlugs.has(f.slug),
            );
            setTree(buildCategoryTree([...catList, ...filtered]));
          } else {
            setTree(buildCategoryTree(catList));
          }
        } else {
          setTree(buildCategoryTree(FALLBACK_CATEGORIES));
        }
      } catch {
        setTree(buildCategoryTree(FALLBACK_CATEGORIES));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return { tree, loading };
}
