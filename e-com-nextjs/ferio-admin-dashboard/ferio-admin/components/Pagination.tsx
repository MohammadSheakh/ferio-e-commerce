"use client";

import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  isLoading?: boolean;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  isLoading = false,
}: PaginationProps) {
  if (totalItems <= 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis algorithm
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [1];

    if (currentPage > 3) {
      pages.push("...");
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push("...");
    }

    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 text-[13px] border-t border-line text-ink2 select-none">
      {/* Entries Info & Page Size Selector */}
      <div className="flex items-center gap-3">
        <span>
          Showing <span className="font-semibold text-ink">{startItem}</span> to{" "}
          <span className="font-semibold text-ink">{endItem}</span> of{" "}
          <span className="font-semibold text-ink">{totalItems}</span> entries
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-[12px]">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              disabled={isLoading}
              className="rounded-lg border border-line bg-paper px-2 py-1 text-[12px] font-medium text-ink outline-none cursor-pointer hover:border-ink focus:border-ink"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-1">
        {/* Previous Button */}
        <button
          type="button"
          disabled={currentPage <= 1 || isLoading}
          onClick={() => onPageChange(currentPage - 1)}
          className="inline-flex items-center justify-center rounded-lg border border-line bg-paper px-3 py-1.5 font-medium text-ink transition hover:bg-surface hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-paper"
        >
          ← Prev
        </button>

        {/* Numbered Page Buttons */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (typeof p === "string") {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 text-ink2">
                  ...
                </span>
              );
            }

            const isActive = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                disabled={isLoading}
                onClick={() => onPageChange(p)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg font-semibold text-[12px] transition ${
                  isActive
                    ? "bg-ink text-white shadow-xs"
                    : "border border-line bg-paper text-ink2 hover:bg-surface hover:text-ink"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          disabled={currentPage >= totalPages || isLoading}
          onClick={() => onPageChange(currentPage + 1)}
          className="inline-flex items-center justify-center rounded-lg border border-line bg-paper px-3 py-1.5 font-medium text-ink transition hover:bg-surface hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-paper"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
