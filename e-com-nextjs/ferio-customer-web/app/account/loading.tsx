export default function AccountLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-12 motion-safe:animate-pulse">
      <div className="flex gap-2 items-center text-xs">
        <div className="h-3 w-10 rounded bg-line" />
        <span className="text-line">/</span>
        <div className="h-3 w-20 rounded bg-line" />
      </div>

      <div className="border-y border-line py-7">
        <div>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="h-20 w-20 shrink-0 rounded-full border border-line bg-surface" />
            <div className="space-y-2 text-center sm:text-left flex-1">
              <div className="mx-auto h-7 w-48 rounded bg-line sm:mx-0" />
              <div className="mx-auto h-4 w-40 rounded bg-line sm:mx-0" />
              <div className="mx-auto h-3.5 w-56 rounded bg-line sm:mx-0" />
            </div>
            <div className="flex sm:flex-col gap-2">
              <div className="h-9 w-28 rounded-full border border-line bg-surface" />
              <div className="h-9 w-28 rounded-full border border-line bg-surface" />
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-6 border-t border-line pt-8">
          <div className="h-6 w-44 rounded bg-line font-semibold" />

          <div className="space-y-5">
            <div className="space-y-1.5">
              <div className="h-3 w-24 rounded bg-line uppercase tracking-eyebrow" />
              <div className="h-11 w-full rounded-card border border-line bg-surface" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-28 rounded bg-line uppercase tracking-eyebrow" />
              <div className="h-11 w-full rounded-card border border-line bg-surface" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-28 rounded bg-line uppercase tracking-eyebrow" />
              <div className="h-11 w-full rounded-card border border-line bg-surface" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-32 rounded bg-line uppercase tracking-eyebrow" />
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
