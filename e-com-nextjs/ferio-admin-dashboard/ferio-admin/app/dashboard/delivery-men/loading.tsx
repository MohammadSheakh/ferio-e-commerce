export default function DeliveryPersonnelLoading() {
  return (
    <main className="motion-safe:animate-pulse">
      <div className="border-b border-line bg-white px-8 py-5">
        <div className="h-6 w-44 rounded bg-line" />
        <div className="mt-2 h-3.5 w-72 rounded bg-line" />
      </div>

      <div className="space-y-6 p-4 xl:p-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="border-y border-line p-5">
              <div className="h-3 w-32 rounded bg-line" />
              <div className="mt-3 h-8 w-14 rounded bg-line" />
            </div>
          ))}
        </div>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex gap-3 border-b border-line pb-2">
            <div className="h-6 w-32 rounded bg-line" />
            <div className="h-6 w-28 rounded bg-line" />
            <div className="h-6 w-24 rounded bg-line" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-28 rounded-full border border-line bg-white" />
            <div className="h-9 w-32 rounded-full bg-ink" />
          </div>
        </div>

        <div className="border-y border-line">
          <div className="flex justify-between border-b border-line px-4 py-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-3 w-20 rounded bg-line" />
            ))}
          </div>
          <div className="divide-y divide-line">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-4 py-4"
              >
                <div className="space-y-1.5">
                  <div className="h-4 w-28 rounded bg-line" />
                  <div className="h-3 w-20 rounded bg-line" />
                </div>
                <div className="h-4 w-28 rounded bg-line" />
                <div className="h-4 w-24 rounded bg-line" />
                <div className="h-6 w-16 rounded-full bg-line" />
                <div className="h-4 w-24 rounded bg-line" />
                <div className="h-8 w-24 rounded-full border border-line bg-white" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
