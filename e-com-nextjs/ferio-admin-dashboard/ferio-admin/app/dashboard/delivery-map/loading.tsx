export default function DeliveryMapLoading() {
  return (
    <main className="motion-safe:animate-pulse">
      <div className="border-b border-line bg-white px-8 py-5">
        <div className="h-6 w-44 rounded bg-line" />
        <div className="mt-2 h-3.5 w-64 rounded bg-line" />
      </div>

      <div className="space-y-6 p-4 xl:p-8">
        <div className="flex flex-col justify-between gap-4 border-b border-line pb-5 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <div className="h-3 w-32 rounded bg-line" />
            <div className="h-4 w-56 rounded bg-line" />
            <div className="h-3 w-72 rounded bg-line" />
          </div>
          <div className="h-9 w-28 rounded-full border border-line bg-white" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-8">
            <section>
              <div className="h-4 w-28 rounded bg-line" />
              <div className="mt-2 h-3 w-full rounded bg-line" />
              <div className="mt-4 divide-y divide-line border-y border-line">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex gap-3 py-3">
                    <div className="h-3 w-3 rounded-full bg-line" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-32 rounded bg-line" />
                      <div className="h-3 w-24 rounded bg-line" />
                      <div className="h-3 w-40 rounded bg-line" />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="h-4 w-44 rounded bg-line" />
              <div className="mt-2 h-3 w-full rounded bg-line" />
              <div className="mt-4 divide-y divide-line border-y border-line">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="space-y-1.5 py-3">
                    <div className="h-4 w-28 rounded bg-line" />
                    <div className="h-3 w-40 rounded bg-line" />
                    <div className="h-3 w-32 rounded bg-line" />
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <div className="h-[640px] rounded-card border border-line bg-surface" />
        </div>
      </div>
    </main>
  );
}
