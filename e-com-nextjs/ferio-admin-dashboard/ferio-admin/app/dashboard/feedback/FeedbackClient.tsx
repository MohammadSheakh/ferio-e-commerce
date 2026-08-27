"use client";

import { useCallback, useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import Pagination from "@/components/Pagination";
import CopyableId from "@/components/CopyableId";

export interface FeedbackItem {
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
  initialItems: FeedbackItem[];
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
    label: "Noted",
    bg: "bg-surface",
    text: "text-ink",
    border: "border-line",
  },
  CONTACTED: {
    label: "Replied",
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

export type FeedbackCategory =
  | "ALL"
  | "SUGGESTION"
  | "FEEDBACK"
  | "WELL_WISH"
  | "FEATURE_REQUEST";

interface ParsedFeedback {
  categoryKey: Exclude<FeedbackCategory, "ALL">;
  categoryLabel: string;
  messageText: string;
}

function parseFeedbackContent(rawText: string): ParsedFeedback {
  if (!rawText) {
    return {
      categoryKey: "FEEDBACK",
      categoryLabel: "Feedback / মতামত",
      messageText: "",
    };
  }

  const parts = rawText.split(/\[Additional Details\]:/i);
  const headerSection = (parts[0] || "").trim();
  const customerDetails = parts[1] ? parts[1].trim() : null;

  let categoryKey: Exclude<FeedbackCategory, "ALL"> = "FEEDBACK";
  let categoryLabel = "Feedback / মতামত";

  const lowerHeader = headerSection.toLowerCase();

  if (lowerHeader.includes("suggestion") || lowerHeader.includes("পরামর্শ")) {
    categoryKey = "SUGGESTION";
    categoryLabel = "Suggestion / পরামর্শ";
  } else if (
    lowerHeader.includes("well_wish") ||
    lowerHeader.includes("well wish") ||
    lowerHeader.includes("শুভকামনা")
  ) {
    categoryKey = "WELL_WISH";
    categoryLabel = "Well Wish / শুভকামনা";
  } else if (lowerHeader.includes("feature") || lowerHeader.includes("ফিচার")) {
    categoryKey = "FEATURE_REQUEST";
    categoryLabel = "Feature Request / ফিচার অনুরোধ";
  }

  const messageText = customerDetails || headerSection.replace(/^\[FEEDBACK:[^\]]+\]/i, "").trim();

  return {
    categoryKey,
    categoryLabel,
    messageText: messageText || rawText,
  };
}

export default function FeedbackClient({ initialItems, initialTotal }: Props) {
  const [items, setItems] = useState<FeedbackItem[]>(initialItems);
  const [totalItems, setTotalItems] = useState<number>(initialTotal || initialItems.length);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(
    Math.ceil((initialTotal || initialItems.length) / 20) || 1
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<FeedbackCategory>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchFeedback = useCallback(async () => {
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
        const results: FeedbackItem[] = data.results || data.items || [];
        const pag = data.pagination || {};
        setItems(results);
        setTotalItems(pag.total ?? data.total ?? results.length);
        setTotalPages(pag.totalPages ?? data.totalPages ?? 1);
      }
    } catch (e) {
      console.error("Failed fetching feedback", e);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, search]);

  useEffect(() => {
    void fetchFeedback();
  }, [fetchFeedback]);

  // Modal State
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState<string>("");
  const [savingNote, setSavingNote] = useState<boolean>(false);

  const openDetailModal = (item: FeedbackItem) => {
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
    if (!confirm("Are you sure you want to delete this feedback entry?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/product-requests/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
        if (selectedItem?.id === id) closeDetailModal();
      } else {
        alert("Failed to delete feedback.");
      }
    } catch {
      alert("Network error deleting feedback.");
    } finally {
      setDeletingId(null);
    }
  };

  // Filter feedback items ONLY
  const feedbackOnlyItems = items.filter((item) => {
    const pName = (item.productName || "").toLowerCase();
    return pName.startsWith("[feedback:") || pName.includes("[user feedback]");
  });

  const filteredItems = feedbackOnlyItems.filter((item) => {
    const parsed = parseFeedbackContent(item.productName);

    if (categoryFilter !== "ALL" && parsed.categoryKey !== categoryFilter) {
      return false;
    }

    if (statusFilter !== "ALL" && item.status !== statusFilter) {
      return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchMsg = parsed.messageText.toLowerCase().includes(q);
      const matchName = (item.name || "").toLowerCase().includes(q);
      const matchPhone = (item.phone || "").toLowerCase().includes(q);
      const matchUserName = (item.user?.name || "").toLowerCase().includes(q);
      const matchEmail = (item.user?.email || "").toLowerCase().includes(q);
      const matchNotes = (item.notes || "").toLowerCase().includes(q);
      return matchMsg || matchName || matchPhone || matchUserName || matchEmail || matchNotes;
    }
    return true;
  });

  const countSuggestions = feedbackOnlyItems.filter(
    (i) => parseFeedbackContent(i.productName).categoryKey === "SUGGESTION"
  ).length;
  const countFeedbackMsgs = feedbackOnlyItems.filter(
    (i) => parseFeedbackContent(i.productName).categoryKey === "FEEDBACK"
  ).length;
  const countWellWishes = feedbackOnlyItems.filter(
    (i) => parseFeedbackContent(i.productName).categoryKey === "WELL_WISH"
  ).length;
  const countFeatureReqs = feedbackOnlyItems.filter(
    (i) => parseFeedbackContent(i.productName).categoryKey === "FEATURE_REQUEST"
  ).length;

  return (
    <>
      <Topbar
        title="Suggestions & Feedback"
        subtitle={`${feedbackOnlyItems.length} customer feedback submission${feedbackOnlyItems.length === 1 ? "" : "s"}`}
      />

      <div className="p-8">
        {/* Category Tabs (Ferio Design Language: Hairline border, monochrome pill selection) */}
        <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-line pb-4">
          <button
            type="button"
            onClick={() => setCategoryFilter("ALL")}
            className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${
              categoryFilter === "ALL"
                ? "bg-ink text-white"
                : "border border-line bg-paper text-ink2 hover:text-ink hover:bg-surface"
            }`}
          >
            All Submissions ({feedbackOnlyItems.length})
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter("SUGGESTION")}
            className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${
              categoryFilter === "SUGGESTION"
                ? "bg-ink text-white"
                : "border border-line bg-paper text-ink2 hover:text-ink hover:bg-surface"
            }`}
          >
            Suggestions ({countSuggestions})
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter("FEEDBACK")}
            className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${
              categoryFilter === "FEEDBACK"
                ? "bg-ink text-white"
                : "border border-line bg-paper text-ink2 hover:text-ink hover:bg-surface"
            }`}
          >
            Feedback ({countFeedbackMsgs})
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter("WELL_WISH")}
            className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${
              categoryFilter === "WELL_WISH"
                ? "bg-ink text-white"
                : "border border-line bg-paper text-ink2 hover:text-ink hover:bg-surface"
            }`}
          >
            Well Wishes ({countWellWishes})
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter("FEATURE_REQUEST")}
            className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${
              categoryFilter === "FEATURE_REQUEST"
                ? "bg-ink text-white"
                : "border border-line bg-paper text-ink2 hover:text-ink hover:bg-surface"
            }`}
          >
            Feature Requests ({countFeatureReqs})
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {["ALL", "PENDING", "COLLECTED", "CONTACTED", "DONE"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-full px-3.5 py-1 text-[12px] font-medium transition ${
                  statusFilter === st
                    ? "bg-surface text-ink font-semibold border border-line"
                    : "text-ink2 hover:text-ink"
                }`}
              >
                {st === "ALL"
                  ? `Status: All`
                  : `${STATUS_CONFIG[st]?.label || st} (${
                      feedbackOnlyItems.filter((i) => i.status === st).length
                    })`}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search feedback, submitter, phone..."
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
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium w-2/5">Message Content</th>
                <th className="px-5 py-3 font-medium">Submitter</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Status & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredItems.map((item) => {
                const conf = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
                const dateObj = new Date(item.createdAt);
                const formattedDateOnly = dateObj.toLocaleDateString("en-US", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                });
                const formattedTimeOnly = dateObj.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                });

                const parsed = parseFeedbackContent(item.productName);
                const isAnon =
                  item.name?.includes("Anonymous") ||
                  item.name?.includes("বেনামী") ||
                  (!item.name && !item.user && !item.phone);

                const contactPhone = item.phone || item.user?.phoneNumber;

                return (
                  <tr key={item.id} className="text-[13px] text-ink hover:bg-surface/50 transition">
                    {/* ID */}
                    <td className="px-4 py-4 align-top w-24">
                      <CopyableId id={item.id} prefix="#" truncateLast5 />
                    </td>

                    {/* Date & Time */}
                    <td className="px-5 py-4 text-ink2 text-[12px] align-top">
                      <div className="leading-tight">
                        <p className="font-medium text-ink/90 whitespace-nowrap">{formattedDateOnly}</p>
                        <p className="text-[11px] text-ink2 mt-0.5 whitespace-nowrap">{formattedTimeOnly}</p>
                      </div>
                    </td>

                    {/* Category Pill */}
                    <td className="px-5 py-4 whitespace-nowrap align-top">
                      <span className="inline-block rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-medium text-ink2 border border-line">
                        {parsed.categoryLabel}
                      </span>
                    </td>

                    {/* Message Content */}
                    <td className="px-5 py-4 text-ink align-top">
                      <div className="rounded-md border border-line bg-surface p-3 space-y-1 max-w-md">
                        <p className="text-[13px] text-ink font-normal whitespace-pre-wrap leading-relaxed">
                          {parsed.messageText}
                        </p>
                      </div>
                    </td>

                    {/* Submitter */}
                    <td className="px-5 py-4 whitespace-nowrap align-top">
                      {isAnon ? (
                        <span className="inline-block rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-medium text-ink2 border border-line">
                          Anonymous / বেনামী
                        </span>
                      ) : item.user ? (
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

                    {/* Contact */}
                    <td className="px-5 py-4 whitespace-nowrap align-top">
                      {contactPhone ? (
                        <a
                          href={`tel:${contactPhone}`}
                          className="block font-mono text-[12px] font-medium text-ink hover:underline"
                        >
                          {contactPhone}
                        </a>
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
                          <option value="COLLECTED">Noted</option>
                          <option value="CONTACTED">Replied</option>
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
                  <td colSpan={7} className="px-5 py-12 text-center text-[13px] text-ink2">
                    {feedbackOnlyItems.length === 0
                      ? "No suggestions or feedback submitted yet."
                      : "No feedback matching your active filters."}
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
                <h3 className="text-base font-semibold text-ink">Feedback Submission Details</h3>
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
              {(() => {
                const parsed = parseFeedbackContent(selectedItem.productName);
                return (
                  <div className="flex items-center justify-between rounded-card border border-line bg-surface p-3.5">
                    <span className="inline-block rounded-full bg-paper border border-line px-3 py-0.5 text-[12px] font-medium text-ink">
                      {parsed.categoryLabel}
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
                      <option value="COLLECTED">Noted</option>
                      <option value="CONTACTED">Replied</option>
                      <option value="DONE">Completed</option>
                    </select>
                  </div>
                );
              })()}

              <div className="rounded-card border border-line bg-surface p-4 space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-eyebrow text-ink2">
                  Submitter Information
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    {selectedItem.name?.includes("Anonymous") ||
                    selectedItem.name?.includes("বেনামী") ||
                    (!selectedItem.name && !selectedItem.user && !selectedItem.phone) ? (
                      <span className="inline-block rounded-full bg-paper border border-line px-3 py-0.5 text-[12px] font-medium text-ink2">
                        Anonymous User / বেনামী ব্যবহারকারী
                      </span>
                    ) : (
                      <>
                        <p className="text-[14px] font-semibold text-ink">
                          {selectedItem.user?.name || selectedItem.name || "Guest Visitor"}
                        </p>
                        {selectedItem.user?.email && (
                          <p className="text-[12px] text-ink2">{selectedItem.user.email}</p>
                        )}
                      </>
                    )}
                  </div>

                  {(selectedItem.phone || selectedItem.user?.phoneNumber) && (
                    <a
                      href={`tel:${selectedItem.phone || selectedItem.user?.phoneNumber}`}
                      className="rounded-full border border-line bg-paper px-3 py-1 text-[12px] font-medium text-ink hover:bg-surface transition"
                    >
                      Call Submitter
                    </a>
                  )}
                </div>
              </div>

              {(() => {
                const parsed = parseFeedbackContent(selectedItem.productName);
                return (
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-eyebrow text-ink2">
                      Message Content
                    </p>
                    <div className="rounded-card border border-line bg-surface p-4">
                      <p className="text-[13px] text-ink whitespace-pre-wrap leading-relaxed">
                        {parsed.messageText}
                      </p>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-2 pt-2 border-t border-line">
                <label className="block text-[11px] font-medium uppercase tracking-eyebrow text-ink2">
                  Internal Admin Remarks / Notes
                </label>
                <textarea
                  rows={3}
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="Type internal remarks regarding action items or response..."
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
                Delete Feedback
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
