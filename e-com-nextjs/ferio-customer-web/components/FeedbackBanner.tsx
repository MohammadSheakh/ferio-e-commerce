"use client";

import { useEffect, useState } from "react";

type FeedbackType = "SUGGESTION" | "FEEDBACK" | "WELL_WISH" | "FEATURE_REQUEST";

export default function FeedbackBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("SUGGESTION");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setErrorMsg("Please write your suggestion, feedback, or message.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    const typeLabelMap: Record<FeedbackType, string> = {
      SUGGESTION: "Suggestion / পরামর্শ",
      FEEDBACK: "Feedback / মতামত",
      WELL_WISH: "Well Wish / শুভকামনা",
      FEATURE_REQUEST: "Feature Request / ফিচার অনুরোধ",
    };

    const finalName = isAnonymous ? "Anonymous User / বেনামী ব্যবহারকারী" : name.trim() || undefined;
    const finalPhone = isAnonymous ? undefined : phone.trim() || undefined;

    const formattedProductName = `[FEEDBACK: ${typeLabelMap[type]}]\n\n[Additional Details]:\n${message.trim()}`;

    try {
      const res = await fetch("/api/product-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: formattedProductName,
          name: finalName,
          phone: finalPhone,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          setIsOpen(false);
          setMessage("");
        }, 2500);
      } else {
        const err = await res.json();
        setErrorMsg(err.message || "Failed to submit feedback.");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mx-auto max-w-6xl px-6 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-card border border-line bg-surface p-5 text-ink transition hover:border-ink/20">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white text-xs font-bold">
              💬
            </span>
            <div>
              <p className="text-[14px] font-medium text-ink">
                পরামর্শ, মতামত বা শুভকামনা জানান (Share your Suggestions &amp; Wishes)
              </p>
              <p className="text-[12px] text-ink2">
                Have a suggestion, feedback, or well wish for us? We&apos;d love to hear your thoughts!
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
                Suggestions &amp; Feedback / পরামর্শ ও মতামত
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
                  Thank You! / আপনাকে অসংখ্য ধন্যবাদ
                </h4>
                <p className="text-[13px] text-ink2">
                  Your valuable suggestion/feedback has been received. We appreciate your support!
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                {errorMsg ? (
                  <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                    {errorMsg}
                  </div>
                ) : null}

                {/* Category Selection Pills */}
                <div>
                  <label className="block text-[12px] font-medium uppercase tracking-eyebrow text-ink2 mb-2">
                    SELECT TYPE / টাইপ নির্বাচন করুন
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setType("SUGGESTION")}
                      className={`rounded-card border py-2 px-3 text-[12px] font-medium transition text-left flex items-center gap-1.5 ${
                        type === "SUGGESTION"
                          ? "border-ink bg-ink text-white"
                          : "border-line bg-surface text-ink hover:border-ink/40"
                      }`}
                    >
                      <span>💡</span> Suggestion / পরামর্শ
                    </button>

                    <button
                      type="button"
                      onClick={() => setType("FEEDBACK")}
                      className={`rounded-card border py-2 px-3 text-[12px] font-medium transition text-left flex items-center gap-1.5 ${
                        type === "FEEDBACK"
                          ? "border-ink bg-ink text-white"
                          : "border-line bg-surface text-ink hover:border-ink/40"
                      }`}
                    >
                      <span>💬</span> Feedback / মতামত
                    </button>

                    <button
                      type="button"
                      onClick={() => setType("WELL_WISH")}
                      className={`rounded-card border py-2 px-3 text-[12px] font-medium transition text-left flex items-center gap-1.5 ${
                        type === "WELL_WISH"
                          ? "border-ink bg-ink text-white"
                          : "border-line bg-surface text-ink hover:border-ink/40"
                      }`}
                    >
                      <span>❤️</span> Well Wish / শুভকামনা
                    </button>

                    <button
                      type="button"
                      onClick={() => setType("FEATURE_REQUEST")}
                      className={`rounded-card border py-2 px-3 text-[12px] font-medium transition text-left flex items-center gap-1.5 ${
                        type === "FEATURE_REQUEST"
                          ? "border-ink bg-ink text-white"
                          : "border-line bg-surface text-ink hover:border-ink/40"
                      }`}
                    >
                      <span>🚀</span> Feature / ফিচার অনুরোধ
                    </button>
                  </div>
                </div>

                {/* Message Input */}
                <div>
                  <label className="block text-[12px] font-medium uppercase tracking-eyebrow text-ink2 mb-1">
                    YOUR MESSAGE / আপনার বক্তব্য *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your suggestions, feedback, or well wishes here... (আপনার পরামর্শ, মতামত বা বার্তা লিখুন)"
                    className="w-full rounded-card border border-line bg-surface px-4 py-2.5 text-[13px] text-ink focus:border-ink focus:outline-none resize-y min-h-[90px]"
                  />
                </div>

                {/* Anonymous Option Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="anonymousCheck"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="h-4 w-4 rounded border-line text-ink focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="anonymousCheck" className="text-[13px] text-ink select-none cursor-pointer font-medium">
                    Send Anonymously / বেনামে পাঠান (Keep identity hidden)
                  </label>
                </div>

                {/* Optional Contact Fields (Hidden or disabled if anonymous checked) */}
                {!isAnonymous && (
                  <>
                    <div>
                      <label className="flex items-center justify-between text-[12px] font-medium uppercase tracking-eyebrow text-ink2 mb-1">
                        <span>Your Name (Optional / ঐচ্ছিক)</span>
                        {isLoggedIn && (
                          <span className="text-[11px] normal-case text-emerald-600 font-normal">
                            (Auto-filled from account)
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter name or leave blank for anonymous"
                        className="w-full rounded-card border border-line bg-surface px-4 py-2.5 text-[13px] text-ink focus:border-ink focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="flex items-center justify-between text-[12px] font-medium uppercase tracking-eyebrow text-ink2 mb-1">
                        <span>Phone / Contact (Optional / ঐচ্ছিক)</span>
                        {isLoggedIn && (
                          <span className="text-[11px] normal-case text-emerald-600 font-normal">
                            (Optional)
                          </span>
                        )}
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="01700000000 (Optional / ঐচ্ছিক)"
                        className="w-full rounded-card border border-line bg-surface px-4 py-2.5 text-[13px] text-ink focus:border-ink focus:outline-none"
                      />
                    </div>
                  </>
                )}

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
                    {submitting ? "Submitting..." : "Submit Feedback"}
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
