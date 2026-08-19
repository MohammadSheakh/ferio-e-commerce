export default function DashboardOverviewLoading() {
  return (
    <div className="animate-pulse">
      {/* Topbar Skeleton Replica */}
      <div className="flex flex-col gap-4 border-b border-line px-8 py-5 xl:flex-row xl:items-center xl:justify-between bg-white">
        <div>
          <div className="h-6 w-32 rounded bg-slate-300 font-semibold" />
          <div className="mt-1 h-3.5 w-60 rounded bg-slate-200" />
        </div>

        {/* Top Right Real-Time Visitor Pills Replica */}
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

      <main className="p-8 space-y-8">
        {/* 6 StatCards Grid Replica */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {[
            "Gross delivered",
            "Placed orders",
            "Needs confirmation",
            "Delivered",
            "RTO",
            "Contribution",
          ].map((label, i) => (
            <div
              key={i}
              className="rounded-card border border-line bg-paper p-4 space-y-3 shadow-xs"
            >
              <p className="text-[11px] font-medium uppercase tracking-eyebrow text-ink2">
                {label}
              </p>
              <div className="h-7 w-24 rounded bg-slate-300" />
              {i === 0 || i === 2 || i === 5 ? (
                <div className="h-3 w-28 rounded bg-slate-200" />
              ) : null}
            </div>
          ))}
        </div>

        {/* 2-Column Section: Left = Recent Orders, Right = Live Page Visitors Card */}
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
          {/* Left: Recent Orders Card (2 cols) */}
          <div className="xl:col-span-2 rounded-card border border-line bg-paper p-6 space-y-4 shadow-xs">
            <div className="flex justify-between items-center border-b border-line pb-4">
              <div className="space-y-1">
                <div className="h-5 w-36 rounded bg-slate-300 font-semibold" />
                <div className="h-3 w-48 rounded bg-slate-200" />
              </div>
              <div className="h-7 w-20 rounded-full border border-line bg-surface" />
            </div>
            <div className="divide-y divide-line">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="py-3 flex justify-between items-center text-sm">
                  <div className="space-y-1">
                    <div className="h-4 w-28 rounded bg-slate-300 font-semibold" />
                    <div className="h-3 w-36 rounded bg-slate-200" />
                  </div>
                  <div className="h-6 w-24 rounded-full bg-slate-200" />
                  <div className="h-4 w-20 rounded bg-slate-300 font-bold" />
                </div>
              ))}
            </div>
          </div>

          {/* Right: Live Page Visitors Card (1 col) */}
          <div className="xl:col-span-1 rounded-card border border-line bg-paper p-6 space-y-4 shadow-xs">
            <div className="flex justify-between items-center border-b border-line pb-4">
              <div className="space-y-1">
                <div className="h-5 w-40 rounded bg-slate-300 font-semibold" />
                <div className="h-3 w-32 rounded bg-slate-200" />
              </div>
              <div className="h-6 w-16 rounded-full bg-emerald-100 border border-emerald-200" />
            </div>

            <div className="space-y-3">
              {["/track", "/cart", "/checkout", "/products", "/"].map((route) => (
                <div key={route} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <div className="h-3.5 w-20 rounded bg-slate-300 font-mono" />
                    <div className="h-3.5 w-12 rounded bg-slate-300 font-semibold" />
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full w-1/3 rounded-full bg-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
