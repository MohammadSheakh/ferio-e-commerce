export default function AccountLoading() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12 space-y-8 animate-pulse">
      {/* Breadcrumb Line */}
      <div className="flex gap-2 items-center text-xs">
        <div className="h-3 w-10 rounded bg-slate-200" />
        <span className="text-slate-300">/</span>
        <div className="h-3 w-20 rounded bg-slate-300" />
      </div>

      {/* Account Header Card Replica (Dark bg-[#111114]) */}
      <div className="overflow-hidden rounded-3xl border border-line bg-paper shadow-sm">
        <div className="bg-[#111114] p-8 text-white">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative h-24 w-24 rounded-full bg-slate-800 shrink-0 border-2 border-slate-700">
              <div className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-slate-700 border border-slate-600" />
            </div>
            <div className="space-y-2 text-center sm:text-left flex-1">
              <div className="h-7 w-48 rounded-lg bg-slate-700 mx-auto sm:mx-0" />
              <div className="h-4 w-40 rounded bg-slate-800 mx-auto sm:mx-0" />
              <div className="h-3.5 w-56 rounded bg-slate-800 mx-auto sm:mx-0" />
            </div>
            <div className="flex sm:flex-col gap-2">
              <div className="h-9 w-28 rounded-full border border-slate-700 bg-slate-800" />
              <div className="h-9 w-28 rounded-full bg-rose-950/60 border border-rose-800/40" />
            </div>
          </div>
        </div>

        {/* Profile Details Form Skeleton */}
        <div className="p-8 space-y-6">
          <div className="h-6 w-44 rounded bg-slate-300 font-semibold" />

          <div className="space-y-5">
            <div className="space-y-1.5">
              <div className="h-3 w-24 rounded bg-slate-200 uppercase tracking-eyebrow" />
              <div className="h-11 w-full rounded-card border border-line bg-surface" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-28 rounded bg-slate-200 uppercase tracking-eyebrow" />
              <div className="h-11 w-full rounded-card border border-line bg-surface" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-28 rounded bg-slate-200 uppercase tracking-eyebrow" />
              <div className="h-11 w-full rounded-card border border-line bg-surface" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-32 rounded bg-slate-200 uppercase tracking-eyebrow" />
              <div className="h-20 w-full rounded-card border border-line bg-surface" />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-line">
            <div className="h-11 w-36 rounded-full bg-[#111114]" />
          </div>
        </div>
      </div>
    </div>
  );
}
