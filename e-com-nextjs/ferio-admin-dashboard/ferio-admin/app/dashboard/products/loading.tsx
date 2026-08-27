export default function ProductsLoading() {
  return (
    <main className="motion-safe:animate-pulse">
      <div className="border-b border-line bg-white px-8 py-5">
        <div className="h-6 w-32 rounded bg-line" />
        <div className="mt-2 h-3.5 w-44 rounded bg-line" />
      </div>

      <div className="space-y-6 p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="h-10 w-full rounded-full border border-line bg-paper sm:w-80" />
          <div className="flex flex-wrap gap-2">
            <div className="h-10 w-28 rounded-full border border-line bg-paper" />
            <div className="h-10 w-32 rounded-full border border-line bg-paper" />
            <div className="h-10 w-32 rounded-full bg-ink" />
          </div>
        </div>

        <div className="border-y border-line">
          <div className="flex justify-between border-b border-line px-5 py-3.5">
            <div className="h-3.5 w-32 rounded bg-line" />
            <div className="h-3.5 w-24 rounded bg-line" />
            <div className="h-3.5 w-20 rounded bg-line" />
            <div className="h-3.5 w-16 rounded bg-line" />
            <div className="h-3.5 w-20 rounded bg-line" />
          </div>
          <div className="divide-y divide-line">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-5 py-4"
              >
                <div className="w-1/3 space-y-1">
                  <div className="h-4 w-44 rounded bg-line" />
                  <div className="h-3 w-24 rounded bg-line" />
                </div>
                <div className="h-4 w-24 rounded bg-line" />
                <div className="h-4 w-20 rounded bg-line" />
                <div className="h-4 w-12 rounded bg-line" />
                <div className="h-7 w-16 rounded-full bg-line" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
