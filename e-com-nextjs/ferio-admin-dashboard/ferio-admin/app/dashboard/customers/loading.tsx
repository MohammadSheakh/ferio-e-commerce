export default function CustomersLoading() {
  return (
    <div className="animate-pulse">
      {/* Topbar Skeleton Replica */}
      <div className="flex flex-col gap-4 border-b border-line px-8 py-5 xl:flex-row xl:items-center xl:justify-between bg-white">
        <div>
          <div className="h-6 w-32 rounded bg-slate-300 font-semibold" />
          <div className="mt-1 h-3.5 w-44 rounded bg-slate-200" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px]">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <div className="h-3 w-12 rounded bg-emerald-200" />
          </div>
          {["/track", "/cart", "/checkout", "/products", "/"].map((route) => (
            <div
              key={route}
              className="flex items-center gap-1.5 rounded-full bg-[#18181b] px-3 py-1 border border-slate-800 shrink-0"
            >
              <div className="h-3 w-12 rounded bg-slate-700" />
              <div className="h-3 w-10 rounded bg-slate-600" />
            </div>
          ))}
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* Search Bar & Filter Buttons */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="h-10 w-full sm:w-80 rounded-full border border-line bg-paper" />
          <div className="flex items-center gap-2">
            {["ALL", "LAST 7 DAYS", "LAST 30 DAYS"].map((f) => (
              <div key={f} className="h-9 w-28 rounded-full bg-slate-200" />
            ))}
          </div>
        </div>

        {/* Customers Table Skeleton */}
        <div className="overflow-hidden rounded-card border border-line bg-paper shadow-xs">
          <div className="border-b border-line bg-surface/50 px-5 py-3.5 flex justify-between text-[11px] uppercase tracking-eyebrow text-ink2">
            <div className="h-3.5 w-32 rounded bg-slate-300" />
            <div className="h-3.5 w-36 rounded bg-slate-300" />
            <div className="h-3.5 w-28 rounded bg-slate-300" />
            <div className="h-3.5 w-20 rounded bg-slate-300" />
            <div className="h-3.5 w-20 rounded bg-slate-300" />
          </div>
          <div className="divide-y divide-line">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-200 shrink-0 border border-line" />
                  <div className="space-y-1">
                    <div className="h-4 w-32 rounded bg-slate-300 font-semibold" />
                    <div className="h-3 w-24 rounded bg-slate-200" />
                  </div>
                </div>
                <div className="h-4 w-40 rounded bg-slate-200 text-xs" />
                <div className="h-4 w-28 rounded bg-slate-200 font-mono text-xs" />
                <div className="h-4 w-16 rounded bg-slate-300 font-bold" />
                <div className="h-6 w-20 rounded-full bg-emerald-50 border border-emerald-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
