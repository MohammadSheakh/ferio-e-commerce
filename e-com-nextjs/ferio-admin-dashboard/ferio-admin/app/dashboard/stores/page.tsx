"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import Pagination from "@/components/Pagination";
import CopyableId from "@/components/CopyableId";

interface StoreLocation {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  isStore: boolean;
  phone?: string;
  email?: string;
  district?: string;
  area?: string;
  address?: string;
  operatingHours?: string;
  operatingDays?: string;
  pickupInstructions?: string;
  _count?: {
    inventory: number;
    orders: number;
  };
}

export default function StoresPage() {
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    code: "",
    name: "",
    district: "Dhaka",
    area: "Dhanmondi",
    address: "",
    phone: "",
    email: "",
    operatingHours: "10:00 AM - 08:30 PM",
    operatingDays: "Sat - Thu",
    pickupInstructions: "Show your 6-digit pickup OTP to the store desk manager.",
  });

  const loadStores = async () => {
    try {
      setLoading(true);
      setError("");
      const query = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (search) query.set("search", search);

      const res = await fetch(`/api/admin/store-locations?${query.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_access_token") || ""}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch store locations");
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.items || data.results || [];
      const total = data.total ?? data.pagination?.total ?? items.length;
      const pages = data.totalPages ?? data.pagination?.totalPages ?? 1;
      setStores(items);
      setTotalItems(total);
      setTotalPages(pages);
    } catch (err: any) {
      setError(err.message || "Failed to load store locations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, [page, pageSize, search]);

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/store-locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("admin_access_token") || ""}`,
        },
        body: JSON.stringify({ ...form, isStore: true, isActive: true }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to create store");
      }

      setMessage("Physical store outlet created successfully!");
      setShowModal(false);
      setForm({
        code: "",
        name: "",
        district: "Dhaka",
        area: "",
        address: "",
        phone: "",
        email: "",
        operatingHours: "10:00 AM - 08:30 PM",
        operatingDays: "Sat - Thu",
        pickupInstructions: "",
      });
      loadStores();
    } catch (err: any) {
      setError(err.message || "Failed to create store");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (store: StoreLocation) => {
    try {
      const res = await fetch(`/api/admin/store-locations/${store.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("admin_access_token") || ""}`,
        },
        body: JSON.stringify({ isActive: !store.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update store status");
      loadStores();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-surface min-h-screen">
      <Topbar title="Store Outlets & Pickup Locations" />

      <main className="p-6 space-y-6 max-w-7xl w-full mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-paper p-5 rounded-xl border border-line shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-ink flex items-center gap-2">
              🏪 Store Outlets Management
            </h1>
            <p className="text-sm text-ink2 mt-1">
              Configure physical store locations available for customer "Pickup from Store" orders.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(searchInput.trim());
                setPage(1);
              }}
              className="flex gap-2"
            >
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search store name or code..."
                className="px-3.5 py-2 border border-line rounded-lg bg-surface text-ink text-xs outline-none focus:ring-1 focus:ring-ink"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-paper border border-line text-ink text-xs font-semibold rounded-lg hover:bg-surface"
              >
                Search
              </button>
            </form>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-ink text-white font-medium text-xs rounded-lg hover:bg-ink/90 transition shadow-xs flex items-center gap-2"
            >
              <span>➕ Add Physical Store</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">
            {error}
          </div>
        )}
        {message && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg">
            {message}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-ink2 font-medium text-sm">
            Loading physical store locations...
          </div>
        ) : (
          <div className="overflow-x-auto rounded-card border border-line bg-paper">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-line bg-surface/50 text-[11px] uppercase tracking-eyebrow text-ink2">
                  <th className="px-4 py-3.5 font-normal w-24">Id</th>
                  <th className="px-5 py-3.5 font-normal">Code</th>
                  <th className="px-5 py-3.5 font-normal">Store Name</th>
                  <th className="px-5 py-3.5 font-normal">District & Address</th>
                  <th className="px-5 py-3.5 font-normal">Contact & Hours</th>
                  <th className="px-5 py-3.5 font-normal">Orders</th>
                  <th className="px-5 py-3.5 font-normal text-right">Status & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stores.map((store) => (
                  <tr key={store.id} className="text-[13px] text-ink/80 hover:bg-surface/30 transition">
                    <td className="px-4 py-4 w-24">
                      <CopyableId id={store.id} />
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[11px] font-mono font-semibold text-ink uppercase bg-surface px-2 py-0.5 rounded border border-line">
                        {store.code}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink">{store.name}</p>
                      {store.pickupInstructions && (
                        <p className="text-[11px] text-amber-700 mt-0.5 line-clamp-1" title={store.pickupInstructions}>
                          💡 {store.pickupInstructions}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-ink2">
                      <p className="font-medium text-ink text-[12px]">{store.district || "Dhaka"}</p>
                      <p className="text-[11px] truncate max-w-xs">{store.address || "—"}</p>
                    </td>
                    <td className="px-5 py-4 text-ink2 text-[12px]">
                      {store.phone && <p>📞 {store.phone}</p>}
                      {store.operatingHours && <p className="text-[11px]">🕒 {store.operatingHours}</p>}
                    </td>
                    <td className="px-5 py-4 text-ink font-medium">
                      📦 {store._count?.orders ?? 0}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span
                          className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
                            store.isStore
                              ? store.isActive
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-600"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {store.isStore
                            ? store.isActive
                              ? "Active"
                              : "Inactive"
                            : "Central Hub"}
                        </span>
                        {store.isStore && (
                          <button
                            onClick={() => toggleStatus(store)}
                            className={`px-3 py-1 rounded text-[11px] font-medium transition ${
                              store.isActive
                                ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            {store.isActive ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {stores.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-[13px] text-ink2">
                      No store outlets found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="bg-paper border border-line rounded-xl overflow-hidden shadow-xs">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            isLoading={loading}
          />
        </div>

        {/* Modal for adding physical store */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-paper border border-line rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="text-lg font-bold text-ink">➕ Add Physical Store Outlet</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-ink2 hover:text-ink text-xl font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateStore} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-ink font-medium mb-1">Store Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. STORE-MIR"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink text-xs focus:ring-1 focus:ring-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-ink font-medium mb-1">District *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dhaka"
                      value={form.district}
                      onChange={(e) => setForm({ ...form, district: e.target.value })}
                      className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink text-xs focus:ring-1 focus:ring-ink"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-ink font-medium mb-1">Store Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ferio Mirpur Outlet"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink text-xs focus:ring-1 focus:ring-ink"
                  />
                </div>

                <div>
                  <label className="block text-ink font-medium mb-1">Full Physical Address *</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Street address, building name, level, area..."
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink text-xs focus:ring-1 focus:ring-ink"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-ink font-medium mb-1">Store Phone Number</label>
                    <input
                      type="text"
                      placeholder="+88017..."
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink text-xs focus:ring-1 focus:ring-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-ink font-medium mb-1">Operating Hours</label>
                    <input
                      type="text"
                      placeholder="10:00 AM - 08:30 PM"
                      value={form.operatingHours}
                      onChange={(e) => setForm({ ...form, operatingHours: e.target.value })}
                      className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink text-xs focus:ring-1 focus:ring-ink"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-ink font-medium mb-1">Pickup Instructions for Customer</label>
                  <input
                    type="text"
                    placeholder="e.g. Present order OTP at ground floor pickup counter."
                    value={form.pickupInstructions}
                    onChange={(e) => setForm({ ...form, pickupInstructions: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink text-xs focus:ring-1 focus:ring-ink"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-line rounded-lg text-ink font-medium hover:bg-surface"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-ink text-white font-medium rounded-lg hover:bg-ink/90 disabled:opacity-50"
                  >
                    {saving ? "Creating..." : "Save Store Outlet"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
