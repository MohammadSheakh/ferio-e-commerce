export default function OrdersLoading() {
  return (
    <div className="animate-pulse">
      {/* Topbar Skeleton Replica */}
      <div className="flex flex-col gap-4 border-b border-line px-8 py-5 xl:flex-row xl:items-center xl:justify-between bg-white">
        <div>
          <div className="h-6 w-28 rounded bg-slate-300 font-semibold" />
          <div className="mt-1 h-3.5 w-48 rounded bg-slate-200" />
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
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Placed", val: "—" },
            { label: "Pending Confirmation", val: "—" },
            { label: "Delivered", val: "—" },
            { label: "RTO", val: "—" },
          ].map((item, i) => (
            <div key={i} className="rounded-card border border-line bg-paper p-4 space-y-2 shadow-xs">
              <p className="text-[11px] font-medium uppercase tracking-eyebrow text-ink2">
                {item.label}
              </p>
              <div className="h-7 w-20 rounded bg-slate-300 font-semibold" />
            </div>
          ))}
        </div>

        {/* Status Filter Pills Row */}
        <div className="flex flex-wrap items-center gap-2">
          {["ALL", "PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "RTO", "CANCELLED"].map((st) => (
            <div key={st} className="h-8 w-24 rounded-full bg-slate-200" />
          ))}
        </div>

        {/* Orders Table Skeleton */}
        <div className="overflow-hidden rounded-card border border-line bg-paper shadow-xs">
          <div className="border-b border-line bg-surface/50 px-5 py-3.5 flex justify-between text-[11px] uppercase tracking-eyebrow text-ink2">
            <div className="h-3.5 w-20 rounded bg-slate-300" />
            <div className="h-3.5 w-32 rounded bg-slate-300" />
            <div className="h-3.5 w-24 rounded bg-slate-300" />
            <div className="h-3.5 w-20 rounded bg-slate-300" />
            <div className="h-3.5 w-20 rounded bg-slate-300" />
          </div>
          <div className="divide-y divide-line">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="h-4 w-28 rounded bg-slate-300 font-semibold" />
                  <div className="h-3 w-20 rounded bg-slate-200" />
                </div>
                <div className="space-y-1 w-1/4">
                  <div className="h-4 w-32 rounded bg-slate-300 font-medium" />
                  <div className="h-3 w-24 rounded bg-slate-200" />
                </div>
                <div className="h-4 w-20 rounded bg-slate-300 font-bold" />
                <div className="h-6 w-24 rounded-full bg-slate-200" />
                <div className="h-6 w-20 rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
