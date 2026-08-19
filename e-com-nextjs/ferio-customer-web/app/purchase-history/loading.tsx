export default function PurchaseHistoryLoading() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-3.5 w-24 rounded bg-slate-200 uppercase tracking-eyebrow" />
        <div className="h-8 w-56 rounded-lg bg-slate-300 font-bold" />
      </div>

      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-card border border-line bg-paper p-6 space-y-4 shadow-xs">
            <div className="flex justify-between items-center border-b border-line pb-3">
              <div className="space-y-1">
                <div className="h-4 w-36 rounded bg-slate-300 font-semibold" />
                <div className="h-3 w-24 rounded bg-slate-200" />
              </div>
              <div className="h-6 w-24 rounded-full bg-emerald-50 border border-emerald-200" />
            </div>
            <div className="flex gap-4 items-center">
              <div className="h-16 w-16 rounded-lg bg-slate-100 shrink-0 border border-line" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/2 rounded bg-slate-300" />
                <div className="h-3 w-1/4 rounded bg-slate-200" />
              </div>
              <div className="h-5 w-24 rounded bg-slate-300 font-bold" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
