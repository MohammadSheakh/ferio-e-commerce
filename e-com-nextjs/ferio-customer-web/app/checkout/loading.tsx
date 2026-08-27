export default function CheckoutLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-10 motion-safe:animate-pulse">
      <div className="flex items-center gap-3 border-b border-line pb-4">
        <div className="h-8 w-44 rounded-lg bg-slate-300" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-5 rounded-card border border-line bg-paper p-6">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <div className="h-5 w-5 rounded-full bg-slate-300" />
              <div className="h-5 w-44 rounded bg-slate-300 font-semibold" />
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="h-3 w-20 rounded bg-slate-200 uppercase tracking-eyebrow" />
                <div className="h-11 w-full rounded-card border border-line bg-surface" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="h-3 w-24 rounded bg-slate-200 uppercase tracking-eyebrow" />
                  <div className="h-11 w-full rounded-card border border-line bg-surface" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-16 rounded bg-slate-200 uppercase tracking-eyebrow" />
                  <div className="h-11 w-full rounded-card border border-line bg-surface" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="h-3 w-28 rounded bg-slate-200 uppercase tracking-eyebrow" />
                <div className="h-20 w-full rounded-card border border-line bg-surface" />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-card border border-line bg-paper p-6">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <div className="h-5 w-5 rounded-full bg-slate-300" />
              <div className="h-5 w-40 rounded bg-slate-300 font-semibold" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-16 rounded-card border-2 border-slate-900 bg-slate-50 p-4 space-y-1" />
              <div className="h-16 rounded-card border border-line bg-surface p-4 space-y-1" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="space-y-6 rounded-card border border-line bg-surface p-6">
            <div className="h-5 w-36 rounded bg-slate-300 font-semibold" />
            <div className="space-y-4 divide-y divide-line">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex gap-3 items-center pt-3">
                  <div className="h-14 w-14 rounded-lg bg-slate-100 shrink-0 border border-line" />
                  <div className="flex-1 space-y-1">
                    <div className="h-4 w-3/4 rounded bg-slate-300" />
                    <div className="h-3 w-1/2 rounded bg-slate-200" />
                  </div>
                  <div className="h-4 w-16 rounded bg-slate-300 font-bold" />
                </div>
              ))}
            </div>

            <div className="border-t border-line pt-4 space-y-3">
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
