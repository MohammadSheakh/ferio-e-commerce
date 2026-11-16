"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";

interface ImagePickerProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
  folder?: string;
}

export default function ImagePicker({
  value,
  onChange,
  label = "Image",
  hint,
  folder = "storefront",
}: ImagePickerProps) {
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploadError("");
    if (!file.type.startsWith("image/")) {
      setUploadError("Only image files (PNG, JPG, WEBP, SVG, GIF) are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Image size must be less than 10MB.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const res = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to upload image.");
      }

      if (data.data?.url) {
        onChange(data.data.url);
      }
    } catch (err: any) {
      setUploadError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-medium text-ink2">
          {label}
        </label>
        <div className="flex items-center gap-1 text-[11px]">
          <button
            type="button"
            onClick={() => setTab("upload")}
            className={`px-2 py-0.5 rounded transition ${
              tab === "upload"
                ? "bg-surface font-medium text-ink"
                : "text-ink2 hover:text-ink"
            }`}
          >
            Upload
          </button>
          <span className="text-ink2/40">|</span>
          <button
            type="button"
            onClick={() => setTab("url")}
            className={`px-2 py-0.5 rounded transition ${
              tab === "url"
                ? "bg-surface font-medium text-ink"
                : "text-ink2 hover:text-ink"
            }`}
          >
            Direct Link
          </button>
        </div>
      </div>

      {hint && <p className="text-[11px] text-ink2">{hint}</p>}

      {uploadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-600">
          {uploadError}
        </div>
      )}

      {/* Current Image Preview (if present) */}
      {value ? (
        <div className="rounded-card border border-line bg-paper p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="relative h-14 w-14 shrink-0 rounded-lg border border-line bg-surface overflow-hidden flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt="Selected"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
            </div>
            <div className="overflow-hidden">
              <p className="text-[12px] font-medium text-ink truncate max-w-[160px]">
                {value.startsWith("http") ? value.split("/").pop() : value}
              </p>
              <p className="text-[10px] text-ink2 truncate max-w-[160px]">
                {value}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (tab === "upload" && fileInputRef.current) {
                  fileInputRef.current.click();
                } else {
                  onChange("");
                }
              }}
              className="rounded-md border border-line px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-surface transition"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="rounded-md border border-line px-2.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 transition"
            >
              Remove
            </button>
          </div>
        </div>
      ) : null}

      {/* Upload Zone */}
      {!value && tab === "upload" && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`rounded-card border border-dashed px-4 py-6 text-center cursor-pointer transition ${
            isDragging
              ? "border-ink bg-surface"
              : "border-line bg-surface/40 hover:bg-surface/70"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
            onChange={handleFileChange}
            className="hidden"
          />
          {uploading ? (
            <div className="flex flex-col items-center justify-center py-1">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-ink border-t-transparent mb-2" />
              <p className="text-[12px] font-medium text-ink">Uploading to media storage...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <svg
                className="h-6 w-6 text-ink2 mb-1.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-[12px] font-medium text-ink">
                Click to upload or drag &amp; drop
              </p>
              <p className="text-[10px] text-ink2 mt-0.5">
                PNG, JPG, WEBP, SVG up to 10MB
              </p>
            </div>
          )}
        </div>
      )}

      {/* Direct URL Input */}
      {!value && tab === "url" && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com/image.webp"
          className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
        />
      )}
    </div>
  );
}

