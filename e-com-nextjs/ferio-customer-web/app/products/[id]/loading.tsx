export default function ProductDetailLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-10 animate-pulse">
      {/* Breadcrumb Line */}
      <div className="flex items-center gap-2 text-xs">
        <div className="h-3 w-10 rounded bg-slate-200" />
        <span className="text-slate-300">/</span>
        <div className="h-3 w-16 rounded bg-slate-200" />
        <span className="text-slate-300">/</span>
        <div className="h-3 w-28 rounded bg-slate-300" />
      </div>

      {/* Main 2-Column Product Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Image Gallery (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="aspect-square w-full rounded-2xl bg-slate-100 border border-line shadow-xs" />
          <div className="flex gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 w-20 rounded-xl bg-slate-100 border border-line" />
            ))}
          </div>
        </div>

        {/* Right Column: Info & Purchase Block (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-3">
            <div className="h-3.5 w-24 rounded bg-slate-200 uppercase tracking-eyebrow" />
            <div className="h-8 w-full rounded bg-slate-300" />
            <div className="h-8 w-4/5 rounded bg-slate-300" />
          </div>

          <div className="flex items-center gap-3">
            <div className="h-7 w-32 rounded bg-slate-300 font-bold" />
            <div className="h-5 w-20 rounded-full bg-emerald-100 border border-emerald-200" />
          </div>

          <div className="rounded-xl bg-surface p-4 border border-line space-y-2">
            <div className="h-3.5 w-full rounded bg-slate-200" />
            <div className="h-3.5 w-5/6 rounded bg-slate-200" />
          </div>

          {/* Variant Selector Options Skeleton */}
          <div className="space-y-3">
            <div className="h-3 w-20 rounded bg-slate-200 uppercase tracking-eyebrow" />
            <div className="flex flex-wrap gap-2">
              <div className="h-10 w-24 rounded-lg bg-[#111114]" />
              <div className="h-10 w-24 rounded-lg border border-line bg-paper" />
              <div className="h-10 w-24 rounded-lg border border-line bg-paper" />
            </div>
          </div>

          {/* Quantity & CTA Buttons Skeleton */}
          <div className="space-y-4 pt-4 border-t border-line">
            <div className="flex gap-3">
              <div className="h-12 w-32 rounded-full border border-line bg-surface" />
              <div className="h-12 flex-1 rounded-full bg-[#111114]" />
            </div>
            <div className="h-12 w-full rounded-full border border-slate-800 bg-slate-900" />
          </div>
        </div>
      </div>

      {/* Description & Specifications Tabs Skeleton */}
      <div className="border-t border-line pt-8 space-y-6">
        <div className="flex gap-6 border-b border-line pb-3">
          <div className="h-6 w-32 rounded bg-slate-300" />
          <div className="h-6 w-28 rounded bg-slate-200" />
        </div>
        <div className="space-y-3 max-w-3xl">
          <div className="h-4 w-full rounded bg-slate-200" />
          <div className="h-4 w-5/6 rounded bg-slate-200" />
          <div className="h-4 w-4/5 rounded bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
