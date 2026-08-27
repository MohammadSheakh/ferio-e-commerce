import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { CatalogCategory } from '@/types/catalog';

export interface CategoryNode extends CatalogCategory {
  children: CategoryNode[];
}

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

/**
 * Categories always come from the backend. Fabricated fallback categories are
 * forbidden in production surfaces: an empty or failing catalog renders an
 * explicit empty/error state instead of invented content.
 */
export function useCategoryTree() {
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiGet<CatalogCategory[]>('/catalog/categories');
        const catList = Array.isArray(res) ? res : ((res as any)?.data || []);
        setTree(buildCategoryTree(Array.isArray(catList) ? catList : []));
        setError(false);
      } catch {
        setTree([]);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return { tree, loading, error };
}
