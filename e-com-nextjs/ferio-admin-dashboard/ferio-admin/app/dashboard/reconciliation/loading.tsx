export default function ReconciliationLoading() {
  return (
    <main className="motion-safe:animate-pulse">
      <div className="border-b border-line bg-paper px-8 py-5">
        <div className="h-6 w-36 rounded bg-line" />
        <div className="mt-2 h-3.5 w-72 rounded bg-line" />
      </div>

      <div className="space-y-10 p-4 sm:p-8">
        {Array.from({ length: 3 }).map((_, sectionIndex) => (
          <section key={sectionIndex}>
            <div className="flex items-end justify-between gap-4">
              <div className="space-y-2">
                <div className="h-5 w-44 rounded bg-line" />
                <div className="h-3 w-80 rounded bg-line" />
              </div>
              <div className="h-9 w-36 rounded-full border border-line" />
            </div>
            <div className="mt-5 border-y border-line">
              {Array.from({ length: sectionIndex === 0 ? 4 : 3 }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-5 border-b border-line py-5 last:border-b-0"
                  >
                    <div className="space-y-2">
                      <div className="h-4 w-48 rounded bg-line" />
                      <div className="h-3 w-72 rounded bg-line" />
                    </div>
                    <div className="h-6 w-24 rounded-full bg-line" />
                  </div>
                ),
              )}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
