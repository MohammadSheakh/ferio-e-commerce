export default function ShippingLoading() {
  return (
    <main className="motion-safe:animate-pulse">
      <div className="border-b border-line bg-paper px-8 py-5">
        <div className="h-6 w-28 rounded bg-line" />
        <div className="mt-2 h-3.5 w-40 rounded bg-line" />
      </div>

      <div className="space-y-9 p-4 sm:p-8">
        <section>
          <div className="h-5 w-36 rounded bg-line" />
          <div className="mt-2 h-3 w-80 rounded bg-line" />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-card border border-line p-5">
                <div className="flex justify-between gap-4">
                  <div className="space-y-2">
                    <div className="h-4 w-28 rounded bg-line" />
                    <div className="h-3 w-44 rounded bg-line" />
                  </div>
                  <div className="h-6 w-20 rounded-full bg-line" />
                </div>
                <div className="mt-5 h-9 w-20 rounded-full border border-line" />
              </div>
            ))}
          </div>
        </section>

        {Array.from({ length: 3 }).map((_, sectionIndex) => (
          <section key={sectionIndex}>
            <div className="flex items-end justify-between gap-4">
              <div className="space-y-2">
                <div className="h-5 w-40 rounded bg-line" />
                <div className="h-3 w-72 rounded bg-line" />
              </div>
              <div className="h-6 w-36 rounded-full bg-line" />
            </div>
            <div className="mt-5 overflow-hidden border-y border-line">
              <div className="flex justify-between border-b border-line px-5 py-3">
                {Array.from({ length: sectionIndex === 2 ? 5 : 7 }).map(
                  (_, index) => (
                    <div key={index} className="h-3 w-16 rounded bg-line" />
                  ),
                )}
              </div>
              <div className="divide-y divide-line">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-5 py-4"
                  >
                    <div className="h-4 w-28 rounded bg-line" />
                    <div className="h-4 w-24 rounded bg-line" />
                    <div className="h-4 w-20 rounded bg-line" />
                    <div className="h-6 w-20 rounded-full bg-line" />
                    <div className="h-4 w-32 rounded bg-line" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

        <section className="border-y border-line py-5">
          <div className="h-5 w-36 rounded bg-line" />
          <div className="mt-2 h-3 w-80 rounded bg-line" />
          <div className="mt-5 h-20 rounded-card bg-line" />
        </section>
      </div>
    </main>
  );
}
