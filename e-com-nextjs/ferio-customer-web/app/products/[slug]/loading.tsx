export default function ProductDetailLoading() {
  return (
    <main className="min-h-screen bg-paper motion-safe:animate-pulse">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex items-center gap-2 text-xs">
          <div className="h-3 w-10 rounded bg-line" />
          <span className="text-line">/</span>
          <div className="h-3 w-16 rounded bg-line" />
          <span className="text-line">/</span>
          <div className="h-3 w-28 rounded bg-line" />
        </div>

        <div className="grid gap-10 md:grid-cols-2 lg:gap-16">
          <div className="space-y-4">
            <div className="aspect-[4/5] w-full rounded-card border border-line bg-surface" />
            <div className="flex gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-20 w-20 rounded-card border border-line bg-surface"
                />
              ))}
            </div>
          </div>

          <div className="space-y-6 md:pt-2">
            <div className="space-y-3">
              <div className="h-3 w-24 rounded bg-line" />
              <div className="h-8 w-full rounded bg-line" />
              <div className="h-8 w-4/5 rounded bg-line" />
            </div>

            <div className="flex items-center gap-3">
              <div className="h-7 w-32 rounded bg-line" />
              <div className="h-4 w-20 rounded bg-line" />
            </div>

            <div className="space-y-2 border-y border-line py-5">
              <div className="h-3.5 w-full rounded bg-line" />
              <div className="h-3.5 w-5/6 rounded bg-line" />
              <div className="h-3.5 w-2/3 rounded bg-line" />
            </div>

            <div className="space-y-3">
              <div className="h-3 w-20 rounded bg-line" />
              <div className="h-11 w-full rounded-card border border-line bg-white" />
            </div>

            <div className="flex gap-3 border-t border-line pt-4">
              <div className="h-12 w-28 rounded-full border border-line bg-white" />
              <div className="h-12 flex-1 rounded-full border border-line bg-white" />
              <div className="h-12 flex-1 rounded-full bg-ink" />
            </div>
          </div>
        </div>

        <div className="space-y-6 border-t border-line pt-10">
          <div className="h-6 w-36 rounded bg-line" />
          <div className="grid gap-8 md:grid-cols-2">
            <div className="aspect-[4/3] rounded-card border border-line bg-surface" />
            <div className="space-y-3 pt-4">
              <div className="h-8 w-2/3 rounded bg-line" />
              <div className="h-4 w-full rounded bg-line" />
              <div className="h-4 w-5/6 rounded bg-line" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
