export default function OrdersLoading() {
  return (
    <main className="motion-safe:animate-pulse">
      <div className="border-b border-line bg-paper px-8 py-5">
        <div className="h-6 w-24 rounded bg-line" />
        <div className="mt-2 h-3.5 w-32 rounded bg-line" />
      </div>

      <div className="space-y-7 p-4 sm:p-8">
        <div className="flex flex-wrap items-end gap-4 border-b border-line pb-7">
          <div>
            <div className="h-3 w-28 rounded bg-line" />
            <div className="mt-2 h-9 w-40 rounded-card bg-line" />
          </div>
          <div className="h-10 w-28 rounded-full bg-ink" />
        </div>

        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-8 w-24 rounded-full bg-line" />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-9 w-32 rounded-card bg-line" />
            ))}
            <div className="h-9 w-64 rounded-card bg-line" />
            <div className="h-9 w-20 rounded-full bg-ink" />
          </div>
        </div>

        <div className="overflow-hidden border-y border-line">
          <div className="flex justify-between border-b border-line px-4 py-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="h-3 w-16 rounded bg-line" />
            ))}
          </div>
          <div className="divide-y divide-line">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-4 py-4"
              >
                <div className="space-y-1.5">
                  <div className="h-4 w-24 rounded bg-line" />
                  <div className="h-3 w-20 rounded bg-line" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-4 w-28 rounded bg-line" />
                  <div className="h-3 w-24 rounded bg-line" />
                </div>
                {Array.from({ length: 5 }).map((_, cellIndex) => (
                  <div key={cellIndex} className="h-4 w-20 rounded bg-line" />
                ))}
                <div className="h-6 w-20 rounded-full bg-line" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
