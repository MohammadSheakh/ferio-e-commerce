export default function WarrantyLoading() {
  return (
    <main className="motion-safe:animate-pulse">
      <div className="border-b border-line bg-paper px-8 py-5">
        <div className="h-6 w-28 rounded bg-line" />
        <div className="mt-2 h-3.5 w-48 rounded bg-line" />
      </div>

      <div className="p-4 sm:p-8">
        <div className="flex items-end justify-between gap-4">
          <div className="h-10 min-w-64 flex-1 rounded-card bg-line" />
          <div className="h-10 w-40 rounded-full bg-line" />
        </div>
        <div className="mt-6 divide-y divide-line border-y border-line">
          {Array.from({ length: 4 }).map((_, index) => (
            <article key={index} className="py-6">
              <div className="flex justify-between gap-4">
                <div className="space-y-2">
                  <div className="h-4 w-72 rounded bg-line" />
                  <div className="h-3 w-52 rounded bg-line" />
                </div>
                <div className="h-6 w-28 rounded-full bg-line" />
              </div>
              <div className="mt-4 h-16 rounded-card border border-line" />
              <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-line" />
                  <div className="h-3 w-4/5 rounded bg-line" />
                  <div className="mt-4 h-28 w-28 rounded-card bg-line" />
                </div>
                <div className="h-32 rounded-card border border-line" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
