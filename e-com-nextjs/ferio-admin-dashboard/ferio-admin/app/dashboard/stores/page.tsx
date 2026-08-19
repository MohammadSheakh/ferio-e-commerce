"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";

import Pagination from "@/components/Pagination";

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {stores.map((store) => (
              <div
                key={store.id}
                className="bg-paper border border-line rounded-xl p-5 shadow-xs hover:border-ink/20 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="text-[11px] font-mono font-semibold text-ink2 uppercase tracking-wider bg-surface px-2 py-0.5 rounded border border-line">
                        {store.code}
                      </span>
                      <h3 className="text-base font-bold text-ink mt-1.5">{store.name}</h3>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        store.isStore
                          ? store.isActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {store.isStore
                        ? store.isActive
                          ? "Active Store"
                          : "Inactive Store"
                        : "Central Hub"}
                    </span>
                  </div>

                  {store.address && (
                    <p className="text-xs text-ink2 mb-3 flex items-start gap-1.5">
                      <span>📍</span> <span>{store.address}</span>
                    </p>
                  )}

                  <div className="space-y-1.5 text-xs text-ink2 bg-surface/50 p-3 rounded-lg border border-line/50 mb-4">
                    {store.phone && (
                      <div className="flex items-center justify-between">
                        <span>Phone:</span>
                        <span className="font-medium text-ink">{store.phone}</span>
                      </div>
                    )}
                    {store.operatingHours && (
                      <div className="flex items-center justify-between">
                        <span>Hours:</span>
                        <span className="font-medium text-ink">{store.operatingHours}</span>
                      </div>
                    )}
                    {store.operatingDays && (
                      <div className="flex items-center justify-between">
                        <span>Days:</span>
                        <span className="font-medium text-ink">{store.operatingDays}</span>
                      </div>
                    )}
                  </div>

                  {store.pickupInstructions && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200/60 mb-4">
                      💡 {store.pickupInstructions}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-line/60 text-xs">
                  <span className="text-ink2 font-medium">
                    📦 {store._count?.orders ?? 0} Pickup Orders
                  </span>
                  {store.isStore && (
                    <button
                      onClick={() => toggleStatus(store)}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                        store.isActive
                          ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      {store.isActive ? "Deactivate" : "Activate"}
                    </button>
                  )}
                </div>
              </div>
            ))}
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
