export default function OrderDetailLoading() {
  return (
    <main className="motion-safe:animate-pulse">
      <div className="border-b border-line bg-paper px-8 py-5">
        <div className="h-6 w-40 rounded bg-line" />
        <div className="mt-2 h-3.5 w-56 rounded bg-line" />
      </div>

      <div className="grid gap-8 p-4 sm:p-8 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-8">
          <div className="rounded-card border border-line p-6">
            <div className="flex justify-between gap-4">
              <div>
                <div className="h-5 w-24 rounded bg-line" />
                <div className="mt-2 h-3 w-64 rounded bg-line" />
              </div>
              <div className="h-7 w-24 rounded-full bg-line" />
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <div className="h-3 w-20 rounded bg-line" />
                  <div className="h-4 w-28 rounded bg-line" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-card border border-line p-6">
            <div className="h-5 w-44 rounded bg-line" />
            <div className="mt-5 divide-y divide-line">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex justify-between py-5">
                  <div className="space-y-2">
                    <div className="h-4 w-64 rounded bg-line" />
                    <div className="h-3 w-40 rounded bg-line" />
                  </div>
                  <div className="h-4 w-20 rounded bg-line" />
                </div>
              ))}
            </div>
          </div>

          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="border-y border-line py-5">
              <div className="h-5 w-36 rounded bg-line" />
              <div className="mt-5 h-16 rounded-card bg-line" />
            </div>
          ))}
        </div>

        <aside className="space-y-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-card border border-line p-6">
              <div className="h-4 w-40 rounded bg-line" />
              <div className="mt-5 space-y-3">
                <div className="h-4 w-full rounded bg-line" />
                <div className="h-4 w-4/5 rounded bg-line" />
                <div className="h-9 w-36 rounded-full bg-line" />
              </div>
            </div>
          ))}
        </aside>
      </div>
    </main>
  );
}
