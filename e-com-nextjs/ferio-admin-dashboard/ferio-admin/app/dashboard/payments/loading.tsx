export default function PaymentsLoading() {
  return (
    <main className="motion-safe:animate-pulse">
      <div className="border-b border-line bg-paper px-8 py-5">
        <div className="h-6 w-28 rounded bg-line" />
        <div className="mt-2 h-3.5 w-48 rounded bg-line" />
      </div>

      <div className="space-y-7 p-4 sm:p-8">
        <section>
          <div className="border-b border-line pb-3">
            <div className="h-5 w-40 rounded bg-line" />
            <div className="mt-2 h-3 w-64 rounded bg-line" />
          </div>
          <div className="grid divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-1 py-5 sm:px-5"
              >
                <div className="space-y-2">
                  <div className="h-4 w-28 rounded bg-line" />
                  <div className="h-3 w-20 rounded bg-line" />
                </div>
                <div className="h-6 w-24 rounded-full bg-line" />
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-between gap-5 border-y border-line py-5">
          <div className="space-y-2">
            <div className="h-5 w-36 rounded bg-line" />
            <div className="h-4 w-44 rounded bg-line" />
            <div className="h-3 w-72 rounded bg-line" />
          </div>
          <div className="h-9 w-40 rounded-full border border-line" />
        </section>

        <div className="flex flex-wrap items-end gap-3 border-b border-line pb-6">
          <div className="h-9 min-w-52 flex-1 rounded-card bg-line" />
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-9 w-32 rounded-card bg-line" />
          ))}
          <div className="h-9 w-20 rounded-full bg-ink" />
        </div>

        <div className="overflow-hidden border-y border-line">
          <div className="flex justify-between border-b border-line px-5 py-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="h-3 w-16 rounded bg-line" />
            ))}
          </div>
          <div className="divide-y divide-line">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-5 py-4"
              >
                <div className="h-4 w-24 rounded bg-line" />
                <div className="h-4 w-20 rounded bg-line" />
                <div className="h-4 w-36 rounded bg-line" />
                <div className="h-4 w-20 rounded bg-line" />
                <div className="h-6 w-16 rounded-full bg-line" />
                <div className="h-6 w-16 rounded-full bg-line" />
                <div className="h-4 w-24 rounded bg-line" />
                <div className="h-6 w-20 rounded-full bg-line" />
                <div className="h-4 w-20 rounded bg-line" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
