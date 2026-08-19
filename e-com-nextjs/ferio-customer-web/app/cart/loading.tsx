export default function CartLoading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-8 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-line pb-4">
        <div className="h-8 w-40 rounded-lg bg-slate-300" />
        <div className="h-5 w-16 rounded-full bg-slate-200" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Cart Items List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex gap-4 rounded-card border border-line bg-paper p-4 items-center shadow-xs"
            >
              <div className="h-20 w-20 rounded-lg bg-slate-100 shrink-0 border border-line" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-slate-300" />
                <div className="h-3 w-1/3 rounded bg-slate-200" />
                <div className="h-4 w-20 rounded bg-slate-300 font-bold" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-24 rounded-full border border-line bg-surface" />
                <div className="h-8 w-8 rounded-full bg-rose-50 border border-rose-100" />
              </div>
            </div>
          ))}
        </div>

        {/* Right: Order Summary Sidebar (5 cols) */}
        <div className="lg:col-span-5">
          <div className="rounded-card border border-line bg-surface p-6 space-y-6 shadow-xs">
            <div className="h-5 w-36 rounded bg-slate-300" />
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <div className="h-4 w-20 rounded bg-slate-200" />
                <div className="h-4 w-16 rounded bg-slate-300" />
              </div>
              <div className="flex justify-between">
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="h-4 w-16 rounded bg-slate-300" />
              </div>
              <div className="border-t border-line pt-3 flex justify-between items-center">
                <div className="h-5 w-24 rounded bg-slate-300 font-semibold" />
                <div className="h-6 w-28 rounded bg-slate-300 font-bold" />
              </div>
            </div>
            <div className="h-12 w-full rounded-full bg-[#111114]" />
          </div>
        </div>
      </div>
    </div>
  );
}
