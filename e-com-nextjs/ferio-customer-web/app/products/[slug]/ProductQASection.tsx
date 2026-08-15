"use client";

import { useState } from "react";

interface QAItem {
  id: string;
  askerName: string;
  date: string;
  question: string;
  answer?: string;
}

const DEFAULT_QUESTIONS: QAItem[] = [
  {
    id: "qa-1",
    askerName: "Farhana Islam",
    date: "04 Aug 2026",
    question: "How many output ports does the Anker power station have?",
    answer:
      "The Anker SOLIX C300 offers 7 versatile output ports, including AC outlets, USB-C, USB-A, and a car socket for multiple devices.",
  },
  {
    id: "qa-2",
    askerName: "Mahmud Hasan",
    date: "01 Aug 2026",
    question: "Is cash on delivery available across Bangladesh for this item?",
    answer:
      "Yes! Cash on delivery is available nationwide across all districts in Bangladesh with clear stock verification.",
  },
];

export default function ProductQASection({
  productId,
}: {
  productId: string;
}) {
  const [qaList, setQaList] = useState<QAItem[]>(DEFAULT_QUESTIONS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [question, setQuestion] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !question.trim()) return;

    const newQA: QAItem = {
      id: `qa-${Date.now()}`,
      askerName: name,
      date: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      question,
    };

    setQaList([newQA, ...qaList]);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setIsModalOpen(false);
      setName("");
      setQuestion("");
    }, 1500);
  };

  return (
    <section className="mt-16 border-t border-line pt-12">
      <div className="rounded-card border border-line bg-paper p-6 md:p-10 shadow-sm">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-line">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-ink">
              Questions ({qaList.length})
            </h2>
            <p className="text-xs text-ink2 mt-1">
              Have question about this product? Get specific details about this product from expert.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded-full border border-ink bg-white px-6 py-2 text-xs font-bold text-ink transition hover:bg-ink hover:text-white shadow-sm"
          >
            Ask Question
          </button>
        </div>

        {/* Q&A List */}
        <div className="divide-y divide-line">
          {qaList.map((item) => (
            <div key={item.id} className="py-6 space-y-2">
              <p className="text-xs font-semibold text-ink2">
                <span className="text-ink font-bold">{item.askerName}</span> on {item.date}
              </p>

              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-ink">Q:</span>
                <p className="text-xs sm:text-sm font-bold text-ink leading-snug">
                  {item.question}
                </p>
              </div>

              {item.answer ? (
                <div className="flex items-start gap-2 pt-1 pl-4 border-l-2 border-line">
                  <span className="text-xs font-bold text-ink2">A:</span>
                  <p className="text-xs sm:text-sm text-ink2 leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-ink2 italic pl-4">
                  Pending expert answer...
                </p>
              )}
            </div>
          ))}
        </div>

      </div>

      {/* Ask Question Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-card border border-line bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-base font-bold text-ink">Ask a Question</h3>
              <button
                onClick={() => setIsModalOpen(false)}
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
                <h4 className="text-sm font-bold text-ink">Question Submitted!</h4>
                <p className="text-xs text-ink2">
                  Our product expert will answer your question shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleAskQuestion} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink uppercase mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Farhana Islam"
                    className="w-full rounded-card border border-line bg-surface px-4 py-2.5 text-xs text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink uppercase mb-1">
                    Your Question
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="What would you like to know about this product?"
                    className="w-full rounded-card border border-line bg-surface px-4 py-2.5 text-xs text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-full border border-line px-5 py-2 text-xs font-medium text-ink hover:bg-surface"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-ink px-6 py-2 text-xs font-bold text-white transition hover:opacity-85 shadow-sm"
                  >
                    Submit Question
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
