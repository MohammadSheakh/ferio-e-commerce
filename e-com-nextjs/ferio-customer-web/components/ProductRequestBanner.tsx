"use client";

import { useEffect, useState } from "react";

export default function ProductRequestBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState<string[]>([""]);
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/account/commerce", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const acc = data.account || data.data?.account;
          if (acc) {
            setIsLoggedIn(true);
            if (acc.name) setName(acc.name);
            if (acc.phoneNumber) setPhone(acc.phoneNumber);
          }
        }
      } catch {
        // Guest user
      }
    }
    void checkAuth();
  }, []);

  const handleAddProduct = () => {
    setProducts((prev) => [...prev, ""]);
  };

  const handleRemoveProduct = (index: number) => {
    if (products.length <= 1) return;
    setProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, value: string) => {
    setProducts((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validProducts = products.map((p) => p.trim()).filter(Boolean);

    if (validProducts.length === 0) {
      setErrorMsg("Please enter at least one product name.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    let formattedProductName =
      validProducts.length > 1
        ? validProducts.map((p, idx) => `${idx + 1}. ${p}`).join("\n")
        : validProducts[0];

    if (description.trim()) {
      formattedProductName += `\n\n[Additional Details]:\n${description.trim()}`;
    }

    try {
      const res = await fetch("/api/product-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: formattedProductName,
          name: name.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          setIsOpen(false);
          setProducts([""]);
          setDescription("");
        }, 2500);
      } else {
        const err = await res.json();
        setErrorMsg(err.message || "Failed to submit product request.");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
                Can&apos;t find what you are looking for? Submit a quick request for multiple products.
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
          <div className="w-full max-w-lg rounded-card border border-line bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-[16px] font-semibold text-ink">
                Request Products / প্রোডাক্টের অনুরোধ
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
                  We will contact you as soon as your requested items are available.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                {errorMsg ? (
                  <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                    {errorMsg}
                  </div>
                ) : null}

                {/* Dynamic Product Input List */}
                <div className="space-y-3">
                  <label className="block text-[12px] font-medium uppercase tracking-eyebrow text-ink2">
                    Product Name(s) / প্রোডাক্টের নামসমূহ
                  </label>

                  {products.map((prod, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        required={idx === 0}
                        value={prod}
                        onChange={(e) => handleProductChange(idx, e.target.value)}
                        placeholder={`Product #${idx + 1} Name (e.g. RTX 4070 Ti, Keychron K2 Keyboard...)`}
                        className="w-full rounded-card border border-line bg-surface px-4 py-2.5 text-[13px] text-ink focus:border-ink focus:outline-none"
                      />
                      {products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(idx)}
                          title="Remove product"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card border border-rose-200 text-rose-600 hover:bg-rose-50 text-sm font-bold transition"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddProduct}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-1.5 text-[12px] font-medium text-ink hover:bg-ink hover:text-white transition"
                  >
                    <span>+</span> Add Another Product / আরও প্রোডাক্ট যোগ করুন
                  </button>
                </div>

                {/* Global Description / Additional Details */}
                <div>
                  <label className="block text-[12px] font-medium uppercase tracking-eyebrow text-ink2 mb-1">
                    Additional Details / Note (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide any specifications, brand preference, quantity, target budget, or timeline..."
                    className="w-full rounded-card border border-line bg-surface px-4 py-2 text-[13px] text-ink focus:border-ink focus:outline-none resize-y min-h-[70px]"
                  />
                </div>

                <div>
                  <label className="flex items-center justify-between text-[12px] font-medium uppercase tracking-eyebrow text-ink2 mb-1">
                    <span>Your Name</span>
                    {isLoggedIn && (
                      <span className="text-[11px] normal-case text-emerald-600 font-normal">
                        (Auto-filled from account)
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    required={!isLoggedIn}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isLoggedIn ? "Your Name" : "Enter your full name"}
                    className="w-full rounded-card border border-line bg-surface px-4 py-2.5 text-[13px] text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <div>
                  <label className="flex items-center justify-between text-[12px] font-medium uppercase tracking-eyebrow text-ink2 mb-1">
                    <span>Phone Number</span>
                    {isLoggedIn && (
                      <span className="text-[11px] normal-case text-emerald-600 font-normal">
                        (Optional for logged-in users)
                      </span>
                    )}
                  </label>
                  <input
                    type="tel"
                    required={!isLoggedIn}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={isLoggedIn ? "01700000000 (Optional)" : "01700000000"}
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
                    disabled={submitting}
                    className="rounded-full bg-ink px-6 py-2 text-[13px] font-medium text-white transition hover:opacity-85 disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Request"}
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
