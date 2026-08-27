export default function RootLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-12 animate-pulse">
      {/* Hero Showcase V2 Skeleton - Exact layout matching HeroSection */}
      <div className="relative overflow-hidden rounded-3xl bg-[#111114] p-8 sm:p-12 text-white border border-slate-800 shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Hero Text Slide */}
          <div className="lg:col-span-7 space-y-5">
            <div className="h-4 w-28 rounded-full bg-slate-800" />
            <div className="space-y-3">
              <div className="h-10 w-4/5 rounded-xl bg-slate-700" />
              <div className="h-10 w-2/3 rounded-xl bg-slate-700" />
            </div>
            <div className="h-16 w-full rounded-2xl bg-slate-800/80 border border-slate-700/50 p-4" />
            <div className="flex items-center gap-4 pt-2">
              <div className="h-12 w-40 rounded-full bg-slate-100" />
              <div className="h-12 w-32 rounded-full border border-slate-700 bg-slate-800" />
            </div>
          </div>
          {/* Right Product Image Preview Box */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="aspect-square w-72 sm:w-80 rounded-2xl bg-slate-800/60 border border-slate-700/60 p-4" />
          </div>
        </div>
        {/* Bottom Slider Navigation Dots */}
        <div className="flex justify-center gap-2 pt-6">
          <div className="h-2 w-8 rounded-full bg-white" />
          <div className="h-2 w-2 rounded-full bg-slate-700" />
          <div className="h-2 w-2 rounded-full bg-slate-700" />
        </div>
      </div>

      {/* Category Pills Skeleton */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-5 w-36 rounded bg-slate-200" />
          <div className="h-4 w-16 rounded bg-slate-100" />
        </div>
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-10 w-32 shrink-0 rounded-full bg-slate-100 border border-line flex items-center px-4 gap-2"
            >
              <div className="h-5 w-5 rounded-full bg-slate-200" />
              <div className="h-3 w-16 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>

      {/* Featured Products Grid Skeleton (8 Product Cards matching exact ProductCard layout) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-3 w-20 rounded bg-slate-200 uppercase tracking-eyebrow" />
            <div className="h-7 w-48 rounded bg-slate-300" />
          </div>
          <div className="h-8 w-28 rounded-full border border-line bg-surface" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="rounded-card border border-line bg-paper p-4 space-y-4 shadow-xs"
            >
              {/* Product Image Square Placeholder */}
              <div className="aspect-square w-full rounded-lg bg-slate-100 relative overflow-hidden">
                <div className="absolute top-2 left-2 h-4 w-12 rounded bg-slate-200" />
              </div>
              {/* Product Category & Title */}
              <div className="space-y-2">
                <div className="h-3 w-16 rounded bg-slate-200" />
                <div className="h-4 w-full rounded bg-slate-300" />
                <div className="h-4 w-3/4 rounded bg-slate-200" />
              </div>
              {/* Price & Add to Cart Button */}
              <div className="flex items-center justify-between pt-2 border-t border-line">
                <div className="h-5 w-20 rounded bg-slate-300" />
                <div className="h-8 w-8 rounded-full bg-[#111114]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Product Request Banner Skeleton */}
      <div className="rounded-card border border-line bg-surface p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-[#111114] shrink-0" />
          <div className="space-y-1.5">
            <div className="h-4 w-72 rounded bg-slate-300" />
            <div className="h-3 w-48 rounded bg-slate-200" />
          </div>
        </div>
        <div className="h-10 w-44 rounded-full bg-[#111114] shrink-0" />
      </div>
    </div>
  );
}
