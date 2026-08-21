export default function ReturnsLoading() {
  return (
    <main className="motion-safe:animate-pulse">
      <div className="border-b border-line bg-paper px-8 py-5">
        <div className="h-6 w-24 rounded bg-line" />
        <div className="mt-2 h-3.5 w-40 rounded bg-line" />
      </div>

      <div className="p-4 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="h-10 w-48 rounded-card bg-line" />
          <div className="h-3 w-80 rounded bg-line" />
        </div>

        <div className="divide-y divide-line border-y border-line">
          {Array.from({ length: 5 }).map((_, index) => (
            <article key={index} className="py-6">
              <div className="flex justify-between gap-4">
                <div className="space-y-2">
                  <div className="h-4 w-52 rounded bg-line" />
                  <div className="h-3 w-44 rounded bg-line" />
                </div>
                <div className="flex gap-2">
                  <div className="h-6 w-20 rounded-full bg-line" />
                  <div className="h-6 w-24 rounded-full bg-line" />
                </div>
              </div>
              <div className="mt-5 h-4 w-56 rounded bg-line" />
              <div className="mt-2 h-3 w-full rounded bg-line" />
              <div className="mt-4 h-20 rounded-card border border-line" />
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
