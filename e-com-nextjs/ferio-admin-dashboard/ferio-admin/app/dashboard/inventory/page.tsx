"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import type {
  InventoryMovement,
  InventoryPage,
  InventoryRow,
} from "@/lib/catalog";

const emptyInventory: InventoryPage = {
  items: [],
  page: 1,
  limit: 30,
  total: 0,
  totalPages: 0,
  summary: { lowStock: 0, discrepancies: 0 },
};

export default function InventoryPageView() {
  const [inventory, setInventory] = useState<InventoryPage>(emptyInventory);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [selected, setSelected] = useState<InventoryRow | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (lowStockOnly) query.set("lowStock", "true");
      const response = await fetch(`/api/catalog/inventory?${query.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: InventoryPage;
        message?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.message || "Unable to load inventory.");
      }
      setInventory(payload.data);
      setSelected((current) =>
        current
          ? payload.data?.items.find((item) => item.variantId === current.variantId) ?? null
          : null,
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load inventory.",
      );
    } finally {
      setLoading(false);
    }
  }, [lowStockOnly, search]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  async function loadMovements(row: InventoryRow) {
    setSelected(row);
    setError("");
    try {
      const response = await fetch(
        `/api/catalog/inventory/${row.variantId}/movements?limit=20`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as {
        data?: InventoryMovement[];
        message?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.message || "Unable to load movement history.");
      }
      setMovements(payload.data);
    } catch (movementError) {
      setError(
        movementError instanceof Error
          ? movementError.message
          : "Unable to load movement history.",
      );
    }
  }

  async function adjustInventory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch(
        `/api/catalog/inventory/${selected.variantId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quantityDelta: Number(form.get("quantityDelta")),
            reason: String(form.get("reason")),
          }),
        },
      );
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "Unable to adjust inventory.");
      }
      formElement.reset();
      await loadInventory();
      await loadMovements(selected);
    } catch (adjustmentError) {
      setError(
        adjustmentError instanceof Error
          ? adjustmentError.message
          : "Unable to adjust inventory.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Topbar
        title="Inventory"
        subtitle={`${inventory.total} SKUs · ${inventory.summary.lowStock} low stock · ${inventory.summary.discrepancies} discrepancies`}
      />
      <div className="p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(searchInput.trim());
            }}
            className="flex max-w-lg flex-1 gap-2"
          >
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search product or SKU"
              className="min-w-0 flex-1 rounded-full border border-line px-4 py-2.5 text-[13px] outline-none focus:border-ink"
            />
            <button className="rounded-full bg-ink px-5 py-2.5 text-[13px] text-white">
              Search
            </button>
          </form>
          <label className="flex items-center gap-2 text-[13px] text-ink2">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(event) => setLowStockOnly(event.target.checked)}
            />
            Low stock only
          </label>
        </div>

        {error && (
          <p role="alert" className="mt-5 text-[13px] text-rose-700">
            {error}
          </p>
        )}

        <div className="mt-6 overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-eyebrow text-ink2">
                <th className="px-5 py-3 font-normal">Product / SKU</th>
                <th className="px-5 py-3 font-normal">On hand</th>
                <th className="px-5 py-3 font-normal">Reserved</th>
                <th className="px-5 py-3 font-normal">Damaged</th>
                <th className="px-5 py-3 font-normal">Available</th>
                <th className="px-5 py-3 font-normal">Threshold</th>
                <th className="px-5 py-3 font-normal">State</th>
                <th className="px-5 py-3 font-normal"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {inventory.items.map((row) => (
                <tr key={row.id} className="text-[13px] text-ink/80">
                  <td className="px-5 py-3.5"><p className="text-ink">{row.product.name}</p><p className="text-[11px] text-ink2">{row.sku} · {row.variantName}</p></td>
                  <td className="px-5 py-3.5">{row.onHand}</td>
                  <td className="px-5 py-3.5">{row.reserved}</td>
                  <td className="px-5 py-3.5">{row.damaged}</td>
                  <td className="px-5 py-3.5 font-medium text-ink">{row.available}</td>
                  <td className="px-5 py-3.5">{row.lowStockThreshold}</td>
                  <td className="px-5 py-3.5">{row.hasDiscrepancy ? <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] text-rose-700">Discrepancy</span> : row.isLowStock ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700">Low stock</span> : <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] text-ink2">In stock</span>}</td>
                  <td className="px-5 py-3.5 text-right"><button onClick={() => void loadMovements(row)} className="text-[12px] text-ink2 underline decoration-line underline-offset-4 hover:text-ink">Review</button></td>
                </tr>
              ))}
              {!loading && inventory.items.length === 0 && <tr><td colSpan={8} className="px-5 py-14 text-center text-[13px] text-ink2">No inventory records match this view.</td></tr>}
              {loading && <tr><td colSpan={8} className="px-5 py-14 text-center text-[13px] text-ink2">Loading inventory…</td></tr>}
            </tbody>
          </table>
        </div>

        {selected && (
          <section className="mt-8 grid gap-8 border-t border-line pt-8 lg:grid-cols-[360px_1fr]">
            <form onSubmit={adjustInventory} className="h-fit rounded-card border border-line p-5">
              <h2 className="text-[16px] font-medium text-ink">Adjust {selected.sku}</h2>
              <p className="mt-1 text-[12px] text-ink2">Enter a positive or negative change. Every adjustment records the actor and reason.</p>
              <label className="mt-4 block text-[12px] text-ink2">Quantity change<input name="quantityDelta" required type="number" step="1" className="mt-1.5 w-full rounded-card border border-line px-3.5 py-2.5 text-[14px] outline-none focus:border-ink" /></label>
              <label className="mt-4 block text-[12px] text-ink2">Reason<textarea name="reason" required minLength={3} rows={3} className="mt-1.5 w-full rounded-card border border-line px-3.5 py-2.5 text-[14px] outline-none focus:border-ink" /></label>
              <button disabled={saving} className="mt-4 rounded-full bg-ink px-5 py-2.5 text-[13px] text-white disabled:opacity-50">{saving ? "Saving…" : "Record adjustment"}</button>
            </form>

            <div>
              <h2 className="text-[16px] font-medium text-ink">Movement history</h2>
              <div className="mt-4 divide-y divide-line border-y border-line">
                {movements.map((movement) => <div key={movement.id} className="grid gap-2 py-3.5 text-[12px] md:grid-cols-[150px_90px_1fr_150px]"><span className="text-ink2">{movement.type.replaceAll("_", " ").toLowerCase()}</span><span className={movement.quantityDelta > 0 ? "text-emerald-700" : "text-rose-700"}>{movement.quantityDelta > 0 ? "+" : ""}{movement.quantityDelta}</span><span className="text-ink">{movement.reason}</span><time className="text-ink2">{new Date(movement.createdAt).toLocaleString("en-BD")}</time></div>)}
                {movements.length === 0 && <p className="py-10 text-center text-[13px] text-ink2">No movements recorded for this SKU.</p>}
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
