export default function TrackLoading() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 space-y-8 animate-pulse">
      <div className="text-center space-y-3">
        <div className="h-4 w-28 rounded-full bg-slate-200 mx-auto uppercase tracking-eyebrow" />
        <div className="h-8 w-64 rounded-lg bg-slate-300 mx-auto font-bold" />
        <div className="h-4 w-80 rounded bg-slate-200 mx-auto" />
      </div>

      <div className="rounded-card border border-line bg-paper p-6 space-y-4 shadow-xs">
        <div className="h-12 w-full rounded-full border border-line bg-surface" />
        <div className="h-12 w-full rounded-full bg-[#111114]" />
      </div>

      {/* Tracking timeline steps skeleton replica */}
      <div className="rounded-card border border-line bg-surface p-6 space-y-6">
        <div className="h-5 w-40 rounded bg-slate-300" />
        <div className="grid grid-cols-4 gap-2 pt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <div className="h-8 w-8 rounded-full bg-slate-200 mx-auto" />
              <div className="h-3 w-16 rounded bg-slate-200 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
