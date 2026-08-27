"use client";

import { useCallback, useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import Pagination from "@/components/Pagination";
import CopyableId from "@/components/CopyableId";

export interface ProductRequestItem {
  id: string;
  productName: string;
  name?: string | null;
  phone?: string | null;
  status: "PENDING" | "COLLECTED" | "CONTACTED" | "DONE";
  notes?: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    phoneNumber?: string | null;
    profileImageUrl?: string;
  } | null;
}

interface Props {
  initialItems: ProductRequestItem[];
  initialTotal: number;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  PENDING: {
    label: "Pending",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
  },
  COLLECTED: {
    label: "Collected",
    bg: "bg-surface",
    text: "text-ink",
    border: "border-line",
  },
  CONTACTED: {
    label: "Contacted",
    bg: "bg-surface",
    text: "text-ink font-medium",
    border: "border-line",
  },
  DONE: {
    label: "Completed",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
};

function parseProductItems(rawText: string): {
  products: string[];
  customerDetails: string | null;
} {
  if (!rawText) return { products: [], customerDetails: null };

  const parts = rawText.split(/\[Additional Details\]:/i);
  const productsSection = parts[0] || "";
  const customerDetails = parts[1] ? parts[1].trim() : null;

  const lines = productsSection
    .split("\n")
    .map((l) => l.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);

  return {
    products: lines.length > 0 ? lines : [productsSection.trim()],
    customerDetails,
  };
}

export default function RequestedProductsClient({ initialItems, initialTotal }: Props) {
  const [items, setItems] = useState<ProductRequestItem[]>(initialItems);
  const [totalItems, setTotalItems] = useState<number>(initialTotal || initialItems.length);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(
    Math.ceil((initialTotal || initialItems.length) / 20) || 1
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (statusFilter !== "ALL") query.set("status", statusFilter);
      if (search) query.set("search", search);

      const res = await fetch(`/api/admin/product-requests?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const results: ProductRequestItem[] = data.results || data.items || [];
        const pag = data.pagination || {};
        setItems(results);
        setTotalItems(pag.total ?? data.total ?? results.length);
        setTotalPages(pag.totalPages ?? data.totalPages ?? 1);
      }
    } catch (e) {
      console.error("Failed fetching product requests", e);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, search]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  // Modal State
  const [selectedItem, setSelectedItem] = useState<ProductRequestItem | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState<string>("");
  const [savingNote, setSavingNote] = useState<boolean>(false);

  const openDetailModal = (item: ProductRequestItem) => {
    setSelectedItem(item);
    setAdminNoteInput(item.notes || "");
  };

  const closeDetailModal = () => {
    setSelectedItem(null);
  };

  const handleUpdateStatus = async (
    id: string,
    newStatus: "PENDING" | "COLLECTED" | "CONTACTED" | "DONE"
  ) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/product-requests/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
        );
        if (selectedItem && selectedItem.id === id) {
          setSelectedItem((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      } else {
        alert("Failed to update status.");
      }
    } catch {
      alert("Network error updating status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveAdminNote = async () => {
    if (!selectedItem) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/admin/product-requests/${selectedItem.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: adminNoteInput.trim() }),
      });

      if (res.ok) {
        const updatedNotes = adminNoteInput.trim();
        setItems((prev) =>
          prev.map((item) =>
            item.id === selectedItem.id ? { ...item, notes: updatedNotes } : item
          )
        );
        setSelectedItem((prev) => (prev ? { ...prev, notes: updatedNotes } : null));
        alert("Admin notes saved.");
      } else {
        alert("Failed to save admin notes.");
      }
    } catch {
      alert("Network error saving notes.");
    } finally {
      setSavingNote(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product request?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/product-requests/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
        if (selectedItem?.id === id) closeDetailModal();
      } else {
        alert("Failed to delete request.");
      }
    } catch {
      alert("Network error deleting request.");
    } finally {
      setDeletingId(null);
    }
  };

  // Exclude Feedback items from Product Requests page
  const productOnlyItems = items.filter((item) => {
    const pName = (item.productName || "").toLowerCase();
    return !pName.startsWith("[feedback:") && !pName.includes("[user feedback]");
  });

  const filteredItems = productOnlyItems.filter((item) => {
    if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchProduct = item.productName.toLowerCase().includes(q);
      const matchName = (item.name || "").toLowerCase().includes(q);
      const matchPhone = (item.phone || "").toLowerCase().includes(q);
      const matchUserName = (item.user?.name || "").toLowerCase().includes(q);
      const matchEmail = (item.user?.email || "").toLowerCase().includes(q);
      const matchNotes = (item.notes || "").toLowerCase().includes(q);
      return matchProduct || matchName || matchPhone || matchUserName || matchEmail || matchNotes;
    }
    return true;
  });

  const countPending = productOnlyItems.filter((i) => i.status === "PENDING").length;
  const countCollected = productOnlyItems.filter((i) => i.status === "COLLECTED").length;
  const countContacted = productOnlyItems.filter((i) => i.status === "CONTACTED").length;
  const countDone = productOnlyItems.filter((i) => i.status === "DONE").length;

  return (
    <>
      <Topbar
        title="Requested Products"
        subtitle={`${productOnlyItems.length} customer product request${productOnlyItems.length === 1 ? "" : "s"}`}
      />

      <div className="p-8">
        {/* Metric Cards (Design Language: Hairline border, muted semantic pills) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div
            onClick={() => setStatusFilter("PENDING")}
            className={`cursor-pointer rounded-card border p-4 transition ${
              statusFilter === "PENDING"
                ? "border-amber-400 bg-amber-50/40"
                : "border-line bg-paper hover:border-ink2"
            }`}
          >
            <p className="text-[11px] font-medium uppercase tracking-eyebrow text-ink2">
              Pending
            </p>
            <p className="mt-2 text-2xl font-semibold text-ink">{countPending}</p>
          </div>

          <div
            onClick={() => setStatusFilter("COLLECTED")}
            className={`cursor-pointer rounded-card border p-4 transition ${
              statusFilter === "COLLECTED"
                ? "border-ink bg-surface"
                : "border-line bg-paper hover:border-ink2"
            }`}
          >
            <p className="text-[11px] font-medium uppercase tracking-eyebrow text-ink2">
              Collected
            </p>
            <p className="mt-2 text-2xl font-semibold text-ink">{countCollected}</p>
          </div>

          <div
            onClick={() => setStatusFilter("CONTACTED")}
            className={`cursor-pointer rounded-card border p-4 transition ${
              statusFilter === "CONTACTED"
                ? "border-ink bg-surface"
                : "border-line bg-paper hover:border-ink2"
            }`}
          >
            <p className="text-[11px] font-medium uppercase tracking-eyebrow text-ink2">
              Contacted
            </p>
            <p className="mt-2 text-2xl font-semibold text-ink">{countContacted}</p>
          </div>

          <div
            onClick={() => setStatusFilter("DONE")}
            className={`cursor-pointer rounded-card border p-4 transition ${
              statusFilter === "DONE"
                ? "border-emerald-400 bg-emerald-50/40"
                : "border-line bg-paper hover:border-ink2"
            }`}
          >
            <p className="text-[11px] font-medium uppercase tracking-eyebrow text-ink2">
              Completed
            </p>
            <p className="mt-2 text-2xl font-semibold text-ink">{countDone}</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {["ALL", "PENDING", "COLLECTED", "CONTACTED", "DONE"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-full px-4 py-1.5 text-[12px] font-medium transition ${
                  statusFilter === st
                    ? "bg-ink text-white"
                    : "border border-line bg-paper text-ink2 hover:text-ink hover:bg-surface"
                }`}
              >
                {st === "ALL"
                  ? `All (${productOnlyItems.length})`
                  : `${STATUS_CONFIG[st]?.label || st} (${
                      productOnlyItems.filter((i) => i.status === st).length
                    })`}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, name, phone..."
              className="w-full rounded-full border border-line bg-paper px-4 py-2 text-[12px] text-ink outline-none focus:border-ink"
            />
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-hidden rounded-card border border-line bg-paper">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line bg-surface text-[11px] uppercase tracking-eyebrow text-ink2">
                <th className="px-4 py-3 font-medium w-24">Id</th>
                <th className="px-5 py-3 font-medium">Date & Time</th>
                <th className="px-5 py-3 font-medium w-2/5">Requested Product(s)</th>
                <th className="px-5 py-3 font-medium">Requester</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Status & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredItems.map((item) => {
                const conf = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
                const formattedDate = new Date(item.createdAt).toLocaleString("en-US", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                });

                const { products, customerDetails } = parseProductItems(item.productName);
                const contactPhone = item.phone || item.user?.phoneNumber;
                const cleanPhoneDigits = contactPhone ? contactPhone.replace(/\D/g, "") : "";
                const formattedWaPhone = cleanPhoneDigits.startsWith("88")
                  ? cleanPhoneDigits
                  : `88${cleanPhoneDigits}`;

                return (
                  <tr key={item.id} className="text-[13px] text-ink hover:bg-surface/50 transition">
                    {/* ID */}
                    <td className="px-4 py-4 align-top w-24">
                      <CopyableId id={item.id} prefix="#" />
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 whitespace-nowrap text-ink2 text-[12px] align-top">
                      {formattedDate}
                    </td>

                    {/* Product Items */}
                    <td className="px-5 py-4 text-ink align-top">
                      <div className="space-y-2 max-w-md">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-medium text-ink2 border border-line">
                            {products.length} {products.length === 1 ? "Product" : "Products"} Requested
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {products.map((prod, pIdx) => (
                            <div
                              key={pIdx}
                              className="flex items-start gap-2 rounded-md bg-surface px-3 py-1.5 text-[13px] font-medium text-ink border border-line"
                            >
                              <span className="font-semibold text-ink2 text-[11px] shrink-0 pt-0.5">
                                #{pIdx + 1}
                              </span>
                              <span className="leading-snug">{prod}</span>
                            </div>
                          ))}
                        </div>

                        {customerDetails && (
                          <p className="text-[12px] text-ink2 italic line-clamp-2 bg-surface rounded p-2 border border-line">
                            &quot;{customerDetails}&quot;
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Requester Info */}
                    <td className="px-5 py-4 whitespace-nowrap align-top">
                      {item.user ? (
                        <div>
                          <p className="font-semibold text-ink">{item.user.name}</p>
                          <p className="text-[11px] text-ink2">{item.user.email}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-semibold text-ink">{item.name || "Guest Visitor"}</p>
                          <span className="inline-block rounded-full bg-surface px-2 py-0.5 text-[10px] text-ink2 font-medium border border-line">
                            Guest Visitor
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Contact Info */}
                    <td className="px-5 py-4 whitespace-nowrap align-top">
                      {contactPhone ? (
                        <div className="space-y-1">
                          <a
                            href={`tel:${contactPhone}`}
                            className="block font-mono text-[12px] font-medium text-ink hover:underline"
                          >
                            {contactPhone}
                          </a>
                          {cleanPhoneDigits.length >= 10 && (
                            <a
                              href={`https://wa.me/${formattedWaPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-medium text-ink hover:bg-line transition border border-line"
                            >
                              WhatsApp
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-ink2 italic text-[11px]">Not provided</span>
                      )}
                    </td>

                    {/* Status & Actions */}
                    <td className="px-5 py-4 whitespace-nowrap align-top">
                      <div className="flex items-center gap-2">
                        <select
                          disabled={updatingId === item.id}
                          value={item.status}
                          onChange={(e) =>
                            handleUpdateStatus(
                              item.id,
                              e.target.value as "PENDING" | "COLLECTED" | "CONTACTED" | "DONE"
                            )
                          }
                          className={`rounded-full border px-3 py-1 text-[11px] font-medium outline-none cursor-pointer ${conf.bg} ${conf.text} ${conf.border}`}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="COLLECTED">Collected</option>
                          <option value="CONTACTED">Contacted</option>
                          <option value="DONE">Completed</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => openDetailModal(item)}
                          className="rounded-full border border-line bg-paper px-2.5 py-1 text-xs text-ink hover:bg-surface transition"
                        >
                          View
                        </button>

                        <button
                          type="button"
                          disabled={deletingId === item.id}
                          onClick={() => handleDelete(item.id)}
                          className="text-rose-600 hover:text-rose-800 text-xs font-medium p-1 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-[13px] text-ink2">
                    {productOnlyItems.length === 0
                      ? "No product requests submitted yet."
                      : "No product requests matching your active status filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
      </div>

      {/* Modal View */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-xl rounded-card border border-line bg-paper p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-line">
              <div>
                <h3 className="text-base font-semibold text-ink">Product Request Details</h3>
                <p className="text-[12px] text-ink2">
                  Submitted on{" "}
                  {new Date(selectedItem.createdAt).toLocaleString("en-US", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </p>
              </div>
              <button
                onClick={closeDetailModal}
                className="text-ink2 hover:text-ink text-sm font-semibold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-5">
              <div className="flex items-center justify-between rounded-card border border-line bg-surface p-3.5">
                <span className="text-[11px] font-medium uppercase tracking-eyebrow text-ink2">
                  Status:
                </span>
                <select
                  disabled={updatingId === selectedItem.id}
                  value={selectedItem.status}
                  onChange={(e) =>
                    handleUpdateStatus(
                      selectedItem.id,
                      e.target.value as "PENDING" | "COLLECTED" | "CONTACTED" | "DONE"
                    )
                  }
                  className="rounded-full border border-line bg-paper px-3 py-1 text-[12px] font-medium text-ink outline-none cursor-pointer"
                >
                  <option value="PENDING">Pending</option>
                  <option value="COLLECTED">Collected</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="DONE">Completed</option>
                </select>
              </div>

              <div className="rounded-card border border-line bg-surface p-4 space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-eyebrow text-ink2">
                  Requester Information
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-[14px] font-semibold text-ink">
                      {selectedItem.user?.name || selectedItem.name || "Guest Visitor"}
                    </p>
                    {selectedItem.user?.email && (
                      <p className="text-[12px] text-ink2">{selectedItem.user.email}</p>
                    )}
                  </div>

                  {(selectedItem.phone || selectedItem.user?.phoneNumber) && (
                    <a
                      href={`tel:${selectedItem.phone || selectedItem.user?.phoneNumber}`}
                      className="rounded-full border border-line bg-paper px-3 py-1 text-[12px] font-medium text-ink hover:bg-surface transition"
                    >
                      Call Requester
                    </a>
                  )}
                </div>
              </div>

              {(() => {
                const { products, customerDetails } = parseProductItems(selectedItem.productName);
                return (
                  <div className="space-y-3">
                    <p className="text-[11px] font-medium uppercase tracking-eyebrow text-ink2">
                      Requested Items ({products.length})
                    </p>
                    <div className="space-y-2">
                      {products.map((prod, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 rounded-card border border-line bg-paper p-3"
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-white text-[10px] font-medium">
                            {idx + 1}
                          </span>
                          <span className="text-[13px] font-medium text-ink leading-relaxed">
                            {prod}
                          </span>
                        </div>
                      ))}
                    </div>

                    {customerDetails && (
                      <div className="rounded-card border border-line bg-surface p-4 space-y-1">
                        <p className="text-[11px] font-medium uppercase tracking-eyebrow text-ink2">
                          Additional Details
                        </p>
                        <p className="text-[13px] text-ink whitespace-pre-wrap leading-relaxed">
                          {customerDetails}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="space-y-2 pt-2 border-t border-line">
                <label className="block text-[11px] font-medium uppercase tracking-eyebrow text-ink2">
                  Internal Admin Notes
                </label>
                <textarea
                  rows={3}
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="Type internal sourcing notes..."
                  className="w-full rounded-card border border-line bg-surface p-3 text-[13px] text-ink outline-none focus:border-ink resize-y"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={savingNote}
                    onClick={handleSaveAdminNote}
                    className="rounded-full bg-ink px-5 py-1.5 text-[12px] font-medium text-white transition hover:opacity-85 disabled:opacity-50"
                  >
                    {savingNote ? "Saving..." : "Save Note"}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
              <button
                type="button"
                onClick={() => handleDelete(selectedItem.id)}
                className="text-rose-600 hover:text-rose-800 text-[12px] font-medium"
              >
                Delete Request
              </button>
              <button
                type="button"
                onClick={closeDetailModal}
                className="rounded-full border border-line bg-surface px-5 py-2 text-[12px] font-medium text-ink hover:bg-paper"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
