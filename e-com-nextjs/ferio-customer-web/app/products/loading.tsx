export default function ProductsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-8 animate-pulse">
      {/* Header Title & Search Input Bar Skeleton */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-line pb-6">
          <div>
            <div className="h-8 w-48 rounded-lg bg-slate-300" />
            <div className="h-4 w-32 rounded bg-slate-200 mt-1" />
          </div>
          <div className="h-11 w-full sm:w-80 rounded-full border border-line bg-surface" />
        </div>
      </div>

      {/* Category Pills Row Skeleton */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 border-b border-line">
        <div className="h-9 w-20 shrink-0 rounded-full bg-[#111114]" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-9 w-28 shrink-0 rounded-full border border-line bg-surface" />
        ))}
      </div>

      {/* 8 Product Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="rounded-card border border-line bg-paper p-4 space-y-4 shadow-xs">
            <div className="aspect-square w-full rounded-lg bg-slate-100 relative overflow-hidden">
              <div className="absolute top-2 left-2 h-4 w-12 rounded bg-slate-200" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-16 rounded bg-slate-200" />
              <div className="h-4 w-full rounded bg-slate-300" />
              <div className="h-4 w-3/4 rounded bg-slate-200" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-line">
              <div className="h-5 w-20 rounded bg-slate-300" />
              <div className="h-8 w-8 rounded-full bg-[#111114]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
