"use client";

import { useState } from "react";

export default function ProductRequestBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [productName, setProductName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setIsOpen(false);
      setProductName("");
      setPhone("");
    }, 2000);
  };

  return (
    <>
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-card border border-line bg-surface p-5 text-ink transition hover:border-ink/20">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white text-xs font-bold">
              ?
            </span>
            <div>
              <p className="text-[14px] font-medium text-ink">
                আপনার কি প্রোডাক্ট লাগবে আমাদের জানান (Tell us what product you need)
              </p>
              <p className="text-[12px] text-ink2">
                Can&apos;t find what you are looking for? Submit a quick request.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(true)}
            className="rounded-full bg-ink px-6 py-2.5 text-[13px] font-medium text-white transition hover:opacity-85"
          >
            Click korun ekhane →
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-card border border-line bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-[16px] font-semibold text-ink">
                Request a Product / প্রোডাক্টের অনুরোধ
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-ink2 hover:text-ink text-sm font-medium"
              >
                ✕
              </button>
            </div>

            {submitted ? (
              <div className="py-8 text-center space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-ink text-white text-sm font-bold">
                  ✓
                </div>
                <h4 className="text-[15px] font-medium text-ink">
                  Request Received / অনুরোধ গৃহীত হয়েছে
                </h4>
                <p className="text-[13px] text-ink2">
                  We will contact you as soon as the item is available.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-[12px] font-medium uppercase tracking-eyebrow text-ink2 mb-1">
                    Product Name & Model
                  </label>
                  <input
                    type="text"
                    required
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. Mechanical Keyboard, RTX 4070 Ti..."
                    className="w-full rounded-card border border-line bg-surface px-4 py-2.5 text-[13px] text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium uppercase tracking-eyebrow text-ink2 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01700000000"
                    className="w-full rounded-card border border-line bg-surface px-4 py-2.5 text-[13px] text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-full border border-line px-5 py-2 text-[13px] font-medium text-ink hover:bg-surface"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-ink px-6 py-2 text-[13px] font-medium text-white transition hover:opacity-85"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
