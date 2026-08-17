"use client";

import { useEffect, useRef, useState } from "react";
import type { CatalogBrand } from "@/lib/catalog";

const inputClass =
  "w-full rounded-card border border-line px-3.5 py-2.5 text-[14px] outline-none focus:border-ink";

interface BrandComboboxProps {
  initialBrandName?: string | null;
  initialBrandId?: string | null;
  onChange?: (brandId: string | null, brandName: string) => void;
}

export default function BrandCombobox({
  initialBrandName = "",
  initialBrandId = null,
  onChange,
}: BrandComboboxProps) {
  const [brands, setBrands] = useState<CatalogBrand[]>([]);
  const [query, setQuery] = useState(initialBrandName ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(initialBrandId ?? null);
  const [selectedName, setSelectedName] = useState<string>(initialBrandName ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadBrands() {
      try {
        const res = await fetch("/api/catalog/brands");
        if (res.ok) {
          const body = (await res.json()) as { data?: CatalogBrand[] };
          if (body.data) {
            setBrands(body.data);
          }
        }
      } catch {
        // Fallback silently if offline
      }
    }
    void loadBrands();
  }, []);

  useEffect(() => {
    function handleClickOutside(evt: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(evt.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelectExisting(brand: CatalogBrand) {
    setSelectedId(brand.id);
    setSelectedName(brand.name);
    setQuery(brand.name);
    setIsOpen(false);
    setError("");
    onChange?.(brand.id, brand.name);
  }

  function handleUseOneOff() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSelectedId(null);
    setSelectedName(trimmed);
    setIsOpen(false);
    setError("");
    onChange?.(null, trimmed);
  }

  async function handleCreateNewBrand() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/catalog/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const body = (await res.json()) as { data?: CatalogBrand; message?: string };
      if (!res.ok || !body.data) {
        throw new Error(body.message || "Failed to create brand.");
      }
      const newBrand = body.data;
      setBrands((prev) => [...prev, newBrand].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedId(newBrand.id);
      setSelectedName(newBrand.name);
      setQuery(newBrand.name);
      setIsOpen(false);
      onChange?.(newBrand.id, newBrand.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create brand.");
    } finally {
      setCreating(false);
    }
  }

  function handleInputChange(text: string) {
    setQuery(text);
    setIsOpen(true);
    setError("");
    // By default update one-off brand text as typing
    setSelectedId(null);
    setSelectedName(text);
    onChange?.(null, text);
  }

  const filteredBrands = brands.filter((b) =>
    b.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const exactMatch = brands.find(
    (b) => b.name.toLowerCase() === query.trim().toLowerCase(),
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <input type="hidden" name="brandId" value={selectedId ?? ""} />
      <input type="hidden" name="brand" value={selectedName} />

      <div className="relative">
        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Search brand or type new..."
          className={inputClass}
        />

        {selectedId ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
            Saved Brand
          </span>
        ) : query.trim() ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            One-off
          </span>
        ) : null}
      </div>

      {error && <p className="mt-1 text-[11px] text-rose-600">{error}</p>}

      {isOpen && (
        <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-card border border-line bg-white shadow-lg">
          {filteredBrands.length > 0 && (
            <div className="p-1">
              <p className="px-2 py-1 text-[10px] uppercase tracking-wider text-ink2 font-semibold">
                Existing Brands
              </p>
              {filteredBrands.map((brand) => (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => handleSelectExisting(brand)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[13px] hover:bg-neutral-100 ${
                    selectedId === brand.id ? "bg-neutral-100 font-medium text-ink" : "text-ink2"
                  }`}
                >
                  <span>{brand.name}</span>
                  {brand._count?.products !== undefined && (
                    <span className="text-[11px] text-neutral-400">
                      {brand._count.products} products
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {query.trim().length > 0 && !exactMatch && (
            <div className="border-t border-line p-2 space-y-1 bg-neutral-50">
              <button
                type="button"
                disabled={creating}
                onClick={handleCreateNewBrand}
                className="flex w-full items-center gap-2 rounded-md bg-ink px-3 py-2 text-left text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                <span>➕ Create & Save &quot;{query.trim()}&quot; as reusable Brand</span>
              </button>

              <button
                type="button"
                onClick={handleUseOneOff}
                className="flex w-full items-center gap-2 rounded-md border border-line px-3 py-1.5 text-left text-[12px] text-ink hover:bg-white"
              >
                <span>🏷️ Use &quot;{query.trim()}&quot; as one-off text (don&apos;t save)</span>
              </button>
            </div>
          )}

          {filteredBrands.length === 0 && !query.trim() && (
            <div className="p-4 text-center text-[12px] text-ink2">
              No brands found. Type a brand name above to create or search.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
